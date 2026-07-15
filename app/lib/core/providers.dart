import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../features/execution/execution_repository.dart';
import 'api/api_client.dart';
import 'api/device_identity.dart';
import 'api/token_store.dart';
import 'offline/outbox_database.dart';
import 'offline/sync_service.dart';

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) => const FlutterSecureStorage());

final tokenStoreProvider = Provider<TokenStore>((ref) => TokenStore(ref.watch(secureStorageProvider)));

final deviceIdentityProvider =
    Provider<DeviceIdentity>((ref) => DeviceIdentity(ref.watch(secureStorageProvider)));

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient(tokenStore: ref.watch(tokenStoreProvider)));

final executionRepositoryProvider =
    Provider<ExecutionRepository>((ref) => ExecutionRepository(api: ref.watch(apiClientProvider)));

/// Kept alive for the app's lifetime — closing/reopening the SQLite connection on every rebuild
/// would be wasteful and risks losing in-flight writes.
final outboxDatabaseProvider = Provider<OutboxDatabase>((ref) {
  final db = OutboxDatabase();
  ref.onDispose(db.close);
  return db;
});

final syncServiceProvider = Provider<SyncService>(
  (ref) => SyncService(db: ref.watch(outboxDatabaseProvider), repository: ref.watch(executionRepositoryProvider)),
);
