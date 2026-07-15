import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:workmanager/workmanager.dart';

import '../../features/execution/execution_repository.dart';
import '../api/api_client.dart';
import '../api/token_store.dart';
import 'outbox_database.dart';
import 'sync_service.dart';

const String syncTaskName = 'field_command_outbox_sync';

/// WorkManager runs this in its own background isolate — it has no access to the running app's
/// widget tree or Riverpod container, so every dependency is built fresh here rather than reused
/// from providers.dart (which pulls in Riverpod/GoRouter, unnecessary weight for a background
/// isolate anyway). Must stay a top-level function (WorkManager's plugin requirement).
@pragma('vm:entry-point')
void backgroundSyncCallbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    try {
      final tokenStore = TokenStore(const FlutterSecureStorage());
      final api = ApiClient(tokenStore: tokenStore);
      final repository = ExecutionRepository(api: api);
      final db = OutboxDatabase();
      final sync = SyncService(db: db, repository: repository);
      await sync.syncPending();
      await db.close();
      return true;
    } catch (e) {
      debugPrint('Background sync failed: $e');
      return false;
    }
  });
}

/// Registers a periodic background sync (Android/iOS only — WorkManager has no Linux/desktop
/// implementation, so this is a no-op there rather than a crash during desktop verification).
Future<void> registerBackgroundSync() async {
  if (kIsWeb) return;
  try {
    await Workmanager().initialize(backgroundSyncCallbackDispatcher);
    await Workmanager().registerPeriodicTask(
      syncTaskName,
      syncTaskName,
      frequency: const Duration(minutes: 15),
      constraints: Constraints(networkType: NetworkType.connected),
    );
  } catch (e) {
    debugPrint('Background sync registration skipped (unsupported platform): $e');
  }
}
