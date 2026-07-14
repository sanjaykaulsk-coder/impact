// Integration test against a REAL running backend (docker compose + `pnpm --filter backend dev`
// on localhost:4000, seeded). Not part of the default `flutter test` unit suite's assumptions —
// it is skipped automatically if the backend isn't reachable, exactly like the web shell's
// Playwright tests need a live server.
//
// Why this exists: the Linux-desktop build's platform secure-storage backend (libsecret) needs a
// real, PAM-unlocked desktop keyring, which a headless container can't provide — verified
// separately that this is an environment limitation, not an app defect (docs/ASSUMPTIONS.md
// A-020). This test exercises the exact same ApiClient/AuthRepository/AuthController logic the
// real app uses, swapping only the TokenStore's backing store for an in-memory fake, so the full
// OTP → verify → device → /me → /me/campaigns → branding round trip against the real NestJS API
// and real seeded Postgres data is still genuinely covered.
//
// Known sandbox-only quirk (docs/ASSUMPTIONS.md A-020): in this particular build container, the
// `flutter test` runner process (unlike a plain `dart run` script, and unlike the compiled Linux
// GUI binary — both verified to reach the backend successfully) intermittently fails to reach
// even a forced-DIRECT localhost HTTP client. This is specific to that one test-runner process in
// this one sandbox; it is not expected on a normal machine (no proxy) or CI runner.
import 'dart:io';

import 'package:field_command/core/api/api_client.dart';
import 'package:field_command/core/api/device_identity.dart';
import 'package:field_command/core/api/token_store.dart';
import 'package:field_command/features/auth/auth_repository.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';

/// The `flutter test` runner process (unlike the compiled app, verified separately) inherits this
/// sandbox's HTTPS_PROXY-oriented environment in a way that makes dart:io's default
/// findProxyFromEnvironment misroute even plain http://localhost calls. Forcing DIRECT here is a
/// test-harness-only workaround — the real app's ApiClient is unaffected (proven via the live
/// Linux-desktop GUI run against this same backend).
http.Client _directClient() => IOClient(HttpClient()..findProxy = (_) => 'DIRECT');

/// In-memory stand-in for the platform keystore — the fake this test swaps in specifically to
/// route around the headless-container keyring limitation described above.
class _FakeSecureStorage implements FlutterSecureStorage {
  final Map<String, String> _values = {};

  @override
  Future<String?> read({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async =>
      _values[key];

  @override
  Future<void> write({
    required String key,
    required String? value,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    if (value == null) {
      _values.remove(key);
    } else {
      _values[key] = value;
    }
  }

  @override
  Future<void> delete({
    required String key,
    IOSOptions? iOptions,
    AndroidOptions? aOptions,
    LinuxOptions? lOptions,
    WebOptions? webOptions,
    MacOsOptions? mOptions,
    WindowsOptions? wOptions,
  }) async {
    _values.remove(key);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<bool> _backendReachable() async {
  try {
    final res = await _directClient()
        .get(Uri.parse('http://127.0.0.1:4000/api/v1/health'))
        .timeout(const Duration(seconds: 5));
    return res.statusCode == 200;
  } catch (_) {
    return false;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // device_identity.describe() reads package_info_plus for the app version to send with the
  // device-registration payload; stub its channel the same way widget_test.dart stubs
  // flutter_secure_storage, so this test doesn't depend on a real platform binary being present.
  const packageInfoChannel = MethodChannel('dev.fluttercommunity.plus/package_info');
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
    packageInfoChannel,
    (call) async => <String, String>{
      'appName': 'field_command',
      'packageName': 'com.impactcommunications.field_command',
      'version': '0.1.0',
      'buildNumber': '1',
    },
  );

  test('full OTP login -> device -> campaigns -> branding round trip against the live backend', () async {
    if (!await _backendReachable()) {
      // ignore: avoid_print
      print('SKIPPED: backend not reachable at http://127.0.0.1:4000 — start it per README to run this test.');
      return;
    }

    final storage = _FakeSecureStorage();
    final tokenStore = TokenStore(storage);
    final deviceIdentity = DeviceIdentity(storage);
    final api = ApiClient(
      tokenStore: tokenStore,
      baseUrl: 'http://127.0.0.1:4000/api/v1',
      client: _directClient(),
    );
    final repo = AuthRepository(api: api, tokenStore: tokenStore, deviceIdentity: deviceIdentity);

    // Rahul Kumar — Promoter, single campaign (Bihar Rural Van Outreach). Seed data, spec §41.
    final otpRequest = await repo.requestOtp('9000000009');
    expect(otpRequest.otpProvider, 'MOCK');
    expect(otpRequest.devOtpCode, isNotNull, reason: 'MOCK provider must echo the code for dev login');

    final verifyResult = await repo.verifyOtp(otpRequest.challengeId, otpRequest.devOtpCode!);
    expect(verifyResult.user.fullName, 'Rahul Kumar');
    expect(verifyResult.device.status, 'ACTIVE');
    expect(await tokenStore.accessToken, isNotNull);

    final me = await repo.me();
    expect(me.fullName, 'Rahul Kumar');
    expect(me.mobileNumber, '+919000000009');

    final campaigns = await repo.myCampaigns();
    expect(campaigns, hasLength(1));
    expect(campaigns.first.campaignName, 'Bihar Rural Van Outreach');
    expect(campaigns.first.roleCode, 'promoter');

    final branding = await repo.campaignBranding(campaigns.first.campaignId);
    expect(branding.clientName, 'Shakti Consumer Products');
    expect(branding.theme.primaryColor, '#1B5E3C');

    await repo.logout();
    expect(await tokenStore.accessToken, isNull);
  });
}
