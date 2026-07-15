import 'dart:convert';
import 'dart:io';

import '../../features/execution/execution_repository.dart';
import 'outbox_database.dart';

/// Drains the outbox: every pending or previously-failed item is retried in creation order.
/// A failure on one item doesn't block the rest — a bad photo shouldn't hold back a check-in.
class SyncService {
  final OutboxDatabase db;
  final ExecutionRepository repository;

  SyncService({required this.db, required this.repository});

  Future<void> syncPending() async {
    final items = await db.pendingOrFailedItems();
    for (final item in items) {
      await db.markSyncing(item.id);
      try {
        await _syncOne(item);
        await db.markSynced(item.id);
      } catch (e) {
        await db.markFailed(item.id, e.toString());
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
        final bytes = await File(item.filePath!).readAsBytes();
        await repository.uploadMedia(
          item.campaignId,
          item.activityInstanceId,
          fileBytes: bytes,
          fileName: payload['fileName'] as String,
          mimeType: payload['mimeType'] as String,
          latitude: (payload['latitude'] as num).toDouble(),
          longitude: (payload['longitude'] as num).toDouble(),
          capturedAt: DateTime.parse(payload['capturedAt'] as String),
          deviceId: payload['deviceId'] as String?,
        );
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
}
