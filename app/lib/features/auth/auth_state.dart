import '../../core/api/models.dart';

class AuthState {
  final bool loading;
  final bool authenticated;
  final MeResponse? user;
  final List<MyCampaignSummary> campaigns;
  final String? selectedCampaignId;
  final String? devicePendingMessage;

  const AuthState({
    this.loading = true,
    this.authenticated = false,
    this.user,
    this.campaigns = const [],
    this.selectedCampaignId,
    this.devicePendingMessage,
  });

  AuthState copyWith({
    bool? loading,
    bool? authenticated,
    MeResponse? user,
    List<MyCampaignSummary>? campaigns,
    String? selectedCampaignId,
    bool clearSelectedCampaign = false,
    String? devicePendingMessage,
    bool clearDevicePending = false,
  }) {
    return AuthState(
      loading: loading ?? this.loading,
      authenticated: authenticated ?? this.authenticated,
      user: user ?? this.user,
      campaigns: campaigns ?? this.campaigns,
      selectedCampaignId: clearSelectedCampaign ? null : (selectedCampaignId ?? this.selectedCampaignId),
      devicePendingMessage: clearDevicePending ? null : (devicePendingMessage ?? this.devicePendingMessage),
    );
  }
}
