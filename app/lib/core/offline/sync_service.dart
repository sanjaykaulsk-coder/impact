import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:crypto/crypto.dart';

import '../../features/execution/execution_repository.dart';
import 'outbox_database.dart';

// Matches the backend's chunk size (backend/src/modules/execution/execution.constants.ts).
const _chunkSizeBytes = 512 * 1024;

// docs/architecture/05's retry schedule: "exponential backoff with jitter (30s -> 2m -> 10m ->
// 30m, cap 6h)".
const _backoffSchedule = [Duration(seconds: 30), Duration(minutes: 2), Duration(minutes: 10), Duration(minutes: 30)];
const _backoffCap = Duration(hours: 6);
final _random = Random();

Duration _backoffFor(int retryCount) {
  final base = retryCount < _backoffSchedule.length
      ? _backoffSchedule[retryCount]
      : _backoffSchedule.last * pow(2, retryCount - _backoffSchedule.length + 1).toDouble();
  final capped = base > _backoffCap ? _backoffCap : base;
  // +/-20% jitter so a burst of items queued at the same moment (e.g. after a long offline
  // stretch) doesn't retry in lockstep.
  final jitterMs = (capped.inMilliseconds * 0.2 * (_random.nextDouble() * 2 - 1)).round();
  final withJitter = capped.inMilliseconds + jitterMs;
  return Duration(milliseconds: withJitter.clamp(0, _backoffCap.inMilliseconds));
}

bool _sameConnectivitySet(List<ConnectivityResult> a, List<ConnectivityResult> b) {
  final sa = a.toSet();
  final sb = b.toSet();
  return sa.length == sb.length && sa.containsAll(sb);
}

/// Drains the outbox. Two things this enforces that a plain "retry everything in whatever order
/// the query returns" loop didn't (found on real-device testing, A-034 onward):
/// 1. **Dependency order**: a check-out that depends on a milestone's photo/form must wait for
///    those to actually sync first — otherwise the server correctly rejects it ("needs at least 1
///    photo — 0 uploaded"), which is confusing to see for something that looked done on screen.
/// 2. **Backoff**: automatic passes (WorkManager, connectivity change) skip anything not yet due
///    for retry; an explicit "Sync now" tap always tries regardless (force: true) — a user
///    pressing the button wants an answer now, not to wait out a timer.
class SyncService {
  final OutboxDatabase db;
  final ExecutionRepository repository;

  SyncService({required this.db, required this.repository});

  Future<void> syncPending({bool force = false}) async {
    final items = await db.pendingOrFailedItems();
    final unsyncedByActivity = <String, List<OutboxItem>>{};
    for (final i in items) {
      unsyncedByActivity.putIfAbsent(i.activityInstanceId, () => []).add(i);
    }

    for (final item in items) {
      if (!force && item.nextRetryAt != null && item.nextRetryAt!.isAfter(DateTime.now())) {
        continue;
      }
      if (item.type == 'checkOut') {
        final siblings = unsyncedByActivity[item.activityInstanceId] ?? const [];
        final waitingOn = siblings.any((s) => s.id != item.id && s.type != 'checkOut');
        if (waitingOn) continue;
      }

      await db.markSyncing(item.id);
      try {
        await _syncOne(item);
        await db.markSynced(item.id);
        unsyncedByActivity[item.activityInstanceId]?.removeWhere((s) => s.id == item.id);
      } catch (e) {
        await db.markFailed(
          item.id,
          e.toString(),
          retryCount: item.retryCount + 1,
          nextRetryAt: DateTime.now().add(_backoffFor(item.retryCount)),
        );
      }
    }
  }

  Future<void> _syncOne(OutboxItem item) async {
    final payload = jsonDecode(item.payloadJson) as Map<String, dynamic>;
    switch (item.type) {
      case 'checkIn':
        await repository.checkIn(
          item.campaignId,
          item.activityInstanceId,
          latitude: (payload['latitude'] as num).toDouble(),
          longitude: (payload['longitude'] as num).toDouble(),
          accuracyMeters: payload['accuracyMeters'] != null ? (payload['accuracyMeters'] as num).toDouble() : null,
          deviceTimestamp: DateTime.parse(payload['deviceTimestamp'] as String),
        );
        break;
      case 'checkOut':
        await repository.checkOut(
          item.campaignId,
          item.activityInstanceId,
          latitude: (payload['latitude'] as num).toDouble(),
          longitude: (payload['longitude'] as num).toDouble(),
          deviceTimestamp: DateTime.parse(payload['deviceTimestamp'] as String),
        );
        break;
      case 'media':
        await _syncMedia(item, payload);
        break;
      case 'milestoneResponse':
        await repository.submitMilestoneResponse(
          item.campaignId,
          item.activityInstanceId,
          clientRef: payload['clientRef'] as String,
          deviceId: payload['deviceId'] as String?,
          fieldResponses: (payload['fieldResponses'] as List<dynamic>).cast<Map<String, dynamic>>(),
        );
        break;
      default:
        throw StateError('Unknown outbox item type: ${item.type}');
    }
  }

  /// Chunked, resumable upload (docs/architecture/05): init -> chunks -> complete. /init is
  /// idempotent on the file's content hash, so a retry after any failure — including this
  /// attempt's own connectivity-change check below — resumes from whichever chunks the server
  /// already confirmed rather than re-sending the whole file.
  Future<void> _syncMedia(OutboxItem item, Map<String, dynamic> payload) async {
    final bytes = await File(item.filePath!).readAsBytes();
    final hash = sha256.convert(bytes).toString();

    final init = await repository.initMediaUpload(
      item.campaignId,
      item.activityInstanceId,
      sha256Hash: hash,
      sizeBytes: bytes.length,
      mimeType: payload['mimeType'] as String,
      latitude: (payload['latitude'] as num).toDouble(),
      longitude: (payload['longitude'] as num).toDouble(),
      capturedAt: DateTime.parse(payload['capturedAt'] as String),
      deviceId: payload['deviceId'] as String?,
    );
    if (init.alreadyComplete) return;

    final sessionId = init.sessionId!;
    final totalChunks = init.totalChunks!;
    final received = init.receivedChunks.toSet();

    // Best-effort approximation of "bind the upload to the network it started on" (full OS-level
    // socket binding needs native platform code this app doesn't have yet — see A-038): if the
    // connectivity type changes partway through (e.g. Wi-Fi to mobile data), abort immediately
    // with a specific, diagnosable reason rather than let the transfer run into a generic timeout
    // on a connection it can no longer complete.
    final startedOn = await Connectivity().checkConnectivity();

    for (var index = 0; index < totalChunks; index++) {
      if (received.contains(index)) continue;
      final start = index * _chunkSizeBytes;
      final end = min(start + _chunkSizeBytes, bytes.length);
      await repository.uploadMediaChunk(item.campaignId, item.activityInstanceId, sessionId, index, bytes.sublist(start, end));

      final now = await Connectivity().checkConnectivity();
      if (!_sameConnectivitySet(startedOn, now)) {
        throw StateError('Network changed mid-upload (Wi-Fi/mobile data switch) — will resume on next retry');
      }
    }

    await repository.completeMediaUpload(item.campaignId, item.activityInstanceId, sessionId);
  }
}
