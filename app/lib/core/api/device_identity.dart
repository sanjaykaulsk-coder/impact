import 'dart:io' show Platform;
import 'dart:math';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:package_info_plus/package_info_plus.dart';

const _fingerprintKey = 'ifc_device_fingerprint';

/// A stable per-install identifier, persisted in the platform keystore/keychain — this is the
/// app's device-binding fingerprint (spec §7), not a hardware ID. Real hardware identifiers are
/// both unreliable to obtain on modern Android and unnecessary here: what device binding needs is
/// "the same value every launch on this install," which a persisted random UUID provides without
/// touching restricted device APIs.
class DeviceIdentity {
  final FlutterSecureStorage _storage;
  DeviceIdentity(this._storage);

  Future<String> fingerprint() async {
    final existing = await _storage.read(key: _fingerprintKey);
    if (existing != null) return existing;
    final generated = _generateUuidV4();
    await _storage.write(key: _fingerprintKey, value: generated);
    return generated;
  }

  Future<Map<String, String?>> describe() async {
    String? model;
    String? osVersion;
    try {
      final plugin = DeviceInfoPlugin();
      if (!kIsWeb && Platform.isAndroid) {
        final info = await plugin.androidInfo;
        model = '${info.manufacturer} ${info.model}';
        osVersion = 'Android ${info.version.release}';
      } else if (!kIsWeb && Platform.isLinux) {
        final info = await plugin.linuxInfo;
        model = info.prettyName;
        osVersion = info.version;
      }
    } catch (_) {
      // Device metadata is descriptive only (shown to supervisors in a future device-info
      // screen); never block login on it being unavailable.
    }
    final packageInfo = await PackageInfo.fromPlatform();
    return {
      'model': model,
      'osVersion': osVersion,
      'appVersion': packageInfo.version,
    };
  }

  String _generateUuidV4() {
    final rand = Random.secure();
    final bytes = List<int>.generate(16, (_) => rand.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    String hex(int start, int end) =>
        bytes.sublist(start, end).map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    return '${hex(0, 4)}-${hex(4, 6)}-${hex(6, 8)}-${hex(8, 10)}-${hex(10, 16)}';
  }
}
