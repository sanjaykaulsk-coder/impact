import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _accessKey = 'ifc_access_token';
const _refreshKey = 'ifc_refresh_token';
const _deviceIdKey = 'ifc_server_device_id';

/// Tokens live in the platform keystore/keychain (encrypted at rest), never SharedPreferences —
/// this is the mobile equivalent of the web shell's noted follow-up hardening, done properly from
/// day one here since flutter_secure_storage makes it no harder than plain storage.
class TokenStore {
  final FlutterSecureStorage _storage;
  TokenStore(this._storage);

  Future<String?> get accessToken => _storage.read(key: _accessKey);
  Future<String?> get refreshToken => _storage.read(key: _refreshKey);

  /// The server-assigned Device row's id (distinct from DeviceIdentity's client-generated
  /// fingerprint) — persisted so offline field submissions can carry it for idempotency
  /// (FormResponse's @@unique([deviceId, clientRef]); see execution's SubmitMilestoneDto).
  Future<String?> get serverDeviceId => _storage.read(key: _deviceIdKey);

  Future<void> save({required String accessToken, required String refreshToken, String? serverDeviceId}) async {
    await _storage.write(key: _accessKey, value: accessToken);
    await _storage.write(key: _refreshKey, value: refreshToken);
    if (serverDeviceId != null) await _storage.write(key: _deviceIdKey, value: serverDeviceId);
  }

  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _deviceIdKey);
  }
}
