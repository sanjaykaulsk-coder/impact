import '../../core/api/api_client.dart';
import '../../core/api/device_identity.dart';
import '../../core/api/models.dart';
import '../../core/api/token_store.dart';

class AuthRepository {
  final ApiClient api;
  final TokenStore tokenStore;
  final DeviceIdentity deviceIdentity;

  AuthRepository({required this.api, required this.tokenStore, required this.deviceIdentity});

  Future<RequestOtpResponse> requestOtp(String mobileNumber) async {
    final json = await api.postPublic('/auth/otp/request', {'mobileNumber': mobileNumber});
    return RequestOtpResponse.fromJson(json as Map<String, dynamic>);
  }

  /// Throws ApiException(403, ...) when the device needs approval (spec §7 device binding) —
  /// the caller distinguishes that from other failures to route to the device-pending screen
  /// rather than a generic error.
  Future<VerifyOtpResponse> verifyOtp(String challengeId, String code) async {
    final fingerprint = await deviceIdentity.fingerprint();
    final descr = await deviceIdentity.describe();
    final json = await api.postPublic('/auth/otp/verify', {
      'challengeId': challengeId,
      'code': code,
      'device': {
        'fingerprint': fingerprint,
        'model': descr['model'],
        'osVersion': descr['osVersion'],
        'appVersion': descr['appVersion'],
      },
    });
    final result = VerifyOtpResponse.fromJson(json as Map<String, dynamic>);
    await tokenStore.save(
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      serverDeviceId: result.device.id,
    );
    return result;
  }

  Future<MeResponse> me() async {
    final json = await api.get('/me');
    return MeResponse.fromJson(json as Map<String, dynamic>);
  }

  Future<List<MyCampaignSummary>> myCampaigns() async {
    final json = await api.get('/me/campaigns') as List<dynamic>;
    return json.map((e) => MyCampaignSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<CampaignBrandingResponse> campaignBranding(String campaignId) async {
    final json = await api.get('/campaigns/$campaignId/branding');
    return CampaignBrandingResponse.fromJson(json as Map<String, dynamic>);
  }

  Future<void> logout() async {
    final refresh = await tokenStore.refreshToken;
    if (refresh != null) {
      try {
        await api.post('/auth/logout', {'refreshToken': refresh});
      } catch (_) {
        // Best-effort server-side revoke; local tokens are cleared regardless.
      }
    }
    await tokenStore.clear();
  }
}
