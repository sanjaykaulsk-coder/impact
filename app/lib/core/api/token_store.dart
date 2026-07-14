import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _accessKey = 'ifc_access_token';
const _refreshKey = 'ifc_refresh_token';

/// Tokens live in the platform keystore/keychain (encrypted at rest), never SharedPreferences —
/// this is the mobile equivalent of the web shell's noted follow-up hardening, done properly from
/// day one here since flutter_secure_storage makes it no harder than plain storage.
class TokenStore {
  final FlutterSecureStorage _storage;
  TokenStore(this._storage);

  Future<String?> get accessToken => _storage.read(key: _accessKey);
  Future<String?> get refreshToken => _storage.read(key: _refreshKey);

  Future<void> save({required String accessToken, required String refreshToken}) async {
    await _storage.write(key: _accessKey, value: accessToken);
    await _storage.write(key: _refreshKey, value: refreshToken);
  }

  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
}
