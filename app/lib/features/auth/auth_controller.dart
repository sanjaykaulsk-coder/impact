import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/models.dart';
import '../../core/providers.dart';
import 'auth_repository.dart';
import 'auth_state.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    api: ref.watch(apiClientProvider),
    tokenStore: ref.watch(tokenStoreProvider),
    deviceIdentity: ref.watch(deviceIdentityProvider),
  );
});

class AuthController extends StateNotifier<AuthState> {
  final AuthRepository repository;
  AuthController(this.repository) : super(const AuthState()) {
    _restore();
  }

  Future<void> _restore() async {
    try {
      final hasToken = await repository.tokenStore.accessToken;
      if (hasToken == null) {
        state = state.copyWith(loading: false);
        return;
      }
      await refresh();
    } catch (_) {
      // The platform secure-storage backend (Keystore/Keychain/libsecret) can legitimately be
      // unavailable — e.g. no unlocked keyring on a fresh Linux session. Fail safe to a logged-out
      // state rather than crashing the app on startup.
      state = state.copyWith(loading: false);
    }
  }

  Future<void> refresh() async {
    state = state.copyWith(loading: true);
    try {
      final user = await repository.me();
      final campaigns = await repository.myCampaigns();
      state = state.copyWith(
        loading: false,
        authenticated: true,
        user: user,
        campaigns: campaigns,
        selectedCampaignId: campaigns.length == 1 ? campaigns.first.campaignId : state.selectedCampaignId,
      );
    } catch (_) {
      await repository.tokenStore.clear();
      state = const AuthState(loading: false, authenticated: false);
    }
  }

  Future<RequestOtpResponse> requestOtp(String mobileNumber) => repository.requestOtp(mobileNumber);

  /// Returns true on success. On device-pending, sets `devicePendingMessage` and returns false
  /// rather than throwing, so the OTP screen can route to the device-pending screen instead of
  /// showing a generic error banner.
  Future<bool> verifyOtp(String challengeId, String code) async {
    try {
      await repository.verifyOtp(challengeId, code);
      await refresh();
      return true;
    } on ApiException catch (e) {
      if (e.statusCode == 403) {
        state = state.copyWith(devicePendingMessage: e.message);
        return false;
      }
      rethrow;
    }
  }

  void clearDevicePending() => state = state.copyWith(clearDevicePending: true);

  void selectCampaign(String campaignId) => state = state.copyWith(selectedCampaignId: campaignId);

  Future<void> logout() async {
    await repository.logout();
    state = const AuthState(loading: false, authenticated: false);
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref.watch(authRepositoryProvider));
});
