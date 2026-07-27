import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../api/api_client.dart';
import '../providers.dart';

const _localeStorageKey = 'ifc_locale';

/// Regional languages (Post-MVP backlog): the field app's language is an explicit user choice,
/// not a fixed default — persisted locally (works before login) and best-effort synced to
/// `User.preferredLanguage` on the backend once signed in, so it follows the user if they log in
/// on a different device. See docs/ASSUMPTIONS.md for why EN/HI use standard ARB-based i18n
/// rather than a hand-rolled string map.
class LocaleController extends StateNotifier<Locale> {
  final FlutterSecureStorage _storage;
  final ApiClient _api;

  LocaleController(this._storage, this._api) : super(const Locale('en')) {
    _restore();
  }

  Future<void> _restore() async {
    try {
      final saved = await _storage.read(key: _localeStorageKey);
      if (saved == 'hi') state = const Locale('hi');
    } catch (_) {
      // Same reasoning as AuthController._restore(): the platform secure-storage backend can
      // legitimately be unavailable (fresh session, no unlocked keyring) — fail safe to the
      // English default rather than crashing app startup.
    }
  }

  /// `syncToServer: false` during first-run restore-from-backend (see auth_controller.dart) to
  /// avoid writing straight back the value that was just read from there.
  Future<void> setLanguage(String languageCode, {bool syncToServer = true}) async {
    state = Locale(languageCode);
    await _storage.write(key: _localeStorageKey, value: languageCode);
    if (syncToServer) {
      try {
        await _api.patch('/me/preferred-language', {'preferredLanguage': languageCode.toUpperCase()});
      } catch (_) {
        // Best-effort — the local choice (what actually drives this device's UI) already took
        // effect regardless of connectivity; the next successful sync catches the server up.
      }
    }
  }

  /// Called once after login if this device has never had an explicit local language choice —
  /// picks up whatever the account's `preferredLanguage` already is (e.g. set by an admin, or
  /// chosen on another device) instead of silently overriding it with the English default.
  Future<void> adoptServerPreferenceIfNoLocalChoiceYet(String preferredLanguage) async {
    final saved = await _storage.read(key: _localeStorageKey);
    if (saved != null) return;
    await setLanguage(preferredLanguage.toLowerCase(), syncToServer: false);
  }
}

final localeControllerProvider = StateNotifierProvider<LocaleController, Locale>((ref) {
  return LocaleController(ref.watch(secureStorageProvider), ref.watch(apiClientProvider));
});
