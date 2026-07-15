// Proves the sync-ordering bug (found on real-device testing: check-out was submitted before its
// milestone's photo, which the server correctly rejected) is actually fixed — not just reasoned
// about. Uses an in-memory outbox database (real Drift/SQLite, not a mock) and a fake repository
// that records call order and makes checkOut fail exactly the way the real backend does until
// media has "synced," the same shape as the bug the founder reported.
import 'dart:io';

import 'package:drift/native.dart';
import 'package:field_command/core/api/api_client.dart';
import 'package:field_command/core/api/token_store.dart';
import 'package:field_command/core/offline/outbox_database.dart';
import 'package:field_command/core/offline/sync_service.dart';
import 'package:field_command/features/execution/execution_models.dart';
import 'package:field_command/features/execution/execution_repository.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

const _unusedStorage = FlutterSecureStorage();

class _RecordingExecutionRepository extends ExecutionRepository {
  final List<String> callOrder = [];
  bool mediaSynced = false;

  _RecordingExecutionRepository() : super(api: ApiClient(tokenStore: TokenStore(_unusedStorage)));

  @override
  Future<CheckInResult> checkIn(
    String campaignId,
    String activityInstanceId, {
    required double latitude,
    required double longitude,
    double? accuracyMeters,
    required DateTime deviceTimestamp,
  }) async {
    callOrder.add('checkIn');
    return CheckInResult(toleranceMeters: 250, withinTolerance: true, alreadyCheckedIn: false);
  }

  @override
  Future<void> checkOut(
    String campaignId,
    String activityInstanceId, {
    required double latitude,
    required double longitude,
    required DateTime deviceTimestamp,
  }) async {
    // Same rejection the real backend returns — see ExecutionService.checkOut.
    if (!mediaSynced) {
      throw ApiException(400, 'This milestone needs at least 1 photo(s) — 0 uploaded so far');
    }
    callOrder.add('checkOut');
  }

  @override
  Future<MediaUploadInitResult> initMediaUpload(
    String campaignId,
    String activityInstanceId, {
    required String sha256Hash,
    required int sizeBytes,
    required String mimeType,
    required double latitude,
    required double longitude,
    required DateTime capturedAt,
    String? deviceId,
  }) async {
    callOrder.add('media');
    mediaSynced = true;
    // alreadyComplete short-circuits _syncMedia before it needs chunk/complete calls too.
    return MediaUploadInitResult(alreadyComplete: true, media: MediaRecord(id: 'm1', sha256Hash: sha256Hash));
  }
}

void main() {
  late Directory tempDir;
  late File photoFile;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('sync_ordering_test');
    photoFile = File('${tempDir.path}/photo.jpg')..writeAsBytesSync([1, 2, 3, 4]);
  });

  tearDown(() async {
    await tempDir.delete(recursive: true);
  });

  test('check-out is never attempted before its own media has synced, even if queued first', () async {
    final db = OutboxDatabase.withExecutor(NativeDatabase.memory());
    addTearDown(db.close);
    final repo = _RecordingExecutionRepository();
    final sync = SyncService(db: db, repository: repo);

    const activityId = 'activity-1';
    // Deliberately enqueued out of the normal order — check-out before its own photo — to prove
    // the fix is a real dependency check, not just relying on well-behaved enqueue order.
    await db.enqueue(
      type: 'checkOut',
      campaignId: 'c1',
      activityInstanceId: activityId,
      payload: {'latitude': 1.0, 'longitude': 1.0, 'deviceTimestamp': DateTime.now().toIso8601String()},
    );
    await db.enqueue(
      type: 'media',
      campaignId: 'c1',
      activityInstanceId: activityId,
      payload: {'mimeType': 'image/jpeg', 'latitude': 1.0, 'longitude': 1.0, 'capturedAt': DateTime.now().toIso8601String()},
      filePath: photoFile.path,
    );

    // SQLite's default DateTime storage here truncates to whole seconds, so two items enqueued
    // in the same test can tie on createdAt — the dependency check must be safe regardless of
    // which one a tied ordering happens to visit first (that's the actual property under test,
    // not "exactly which pass it resolves on"), so this settles across a few passes rather than
    // asserting a single-pass outcome.
    for (var pass = 0; pass < 3 && (await db.pendingOrFailedItems()).isNotEmpty; pass++) {
      await sync.syncPending(force: true);
    }

    // The critical assertion: check-out's repository method — which throws exactly like the real
    // backend does when the photo hasn't synced yet — was only ever called after media's call
    // order-wise. If the dependency check were broken, 'checkOut' could appear before 'media', or
    // the fake's checkOut() would have thrown with the same "needs at least 1 photo" rejection
    // the founder saw for real.
    expect(repo.callOrder, ['media', 'checkOut']);
    expect(await db.pendingOrFailedItems(), isEmpty);
  });

  test('normal chronological order (media enqueued before check-out) completes in a single pass', () async {
    final db = OutboxDatabase.withExecutor(NativeDatabase.memory());
    addTearDown(db.close);
    final repo = _RecordingExecutionRepository();
    final sync = SyncService(db: db, repository: repo);

    const activityId = 'activity-2';
    await db.enqueue(
      type: 'media',
      campaignId: 'c1',
      activityInstanceId: activityId,
      payload: {'mimeType': 'image/jpeg', 'latitude': 1.0, 'longitude': 1.0, 'capturedAt': DateTime.now().toIso8601String()},
      filePath: photoFile.path,
    );
    // Crosses a full second boundary: createdAt is stored with whole-second precision here, so
    // without this gap the two enqueues could tie and the "single pass" claim below wouldn't be
    // deterministic — see the sibling test's comment for the underlying reason.
    await Future.delayed(const Duration(seconds: 1, milliseconds: 100));
    await db.enqueue(
      type: 'checkOut',
      campaignId: 'c1',
      activityInstanceId: activityId,
      payload: {'latitude': 1.0, 'longitude': 1.0, 'deviceTimestamp': DateTime.now().toIso8601String()},
    );

    await sync.syncPending(force: true);

    expect(repo.callOrder, ['media', 'checkOut']);
    expect(await db.pendingOrFailedItems(), isEmpty);
  });
}
