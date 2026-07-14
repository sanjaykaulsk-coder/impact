// Hand-maintained Dart mirror of shared/src/index.ts — Dart and TypeScript can't share a single
// source of truth without a codegen step, which is out of scope for Phase C. Keep both in sync
// when a backend response shape changes.

class RequestOtpResponse {
  final String challengeId;
  final DateTime expiresAt;
  final String otpProvider;
  final String? devOtpCode;

  RequestOtpResponse({
    required this.challengeId,
    required this.expiresAt,
    required this.otpProvider,
    this.devOtpCode,
  });

  factory RequestOtpResponse.fromJson(Map<String, dynamic> json) => RequestOtpResponse(
        challengeId: json['challengeId'] as String,
        expiresAt: DateTime.parse(json['expiresAt'] as String),
        otpProvider: json['otpProvider'] as String,
        devOtpCode: json['devOtpCode'] as String?,
      );
}

class AuthUser {
  final String id;
  final String fullName;
  final String preferredLanguage;

  AuthUser({required this.id, required this.fullName, required this.preferredLanguage});

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as String,
        fullName: json['fullName'] as String,
        preferredLanguage: json['preferredLanguage'] as String,
      );
}

class AuthDevice {
  final String id;
  final String status;

  AuthDevice({required this.id, required this.status});

  factory AuthDevice.fromJson(Map<String, dynamic> json) =>
      AuthDevice(id: json['id'] as String, status: json['status'] as String);
}

class VerifyOtpResponse {
  final String accessToken;
  final String refreshToken;
  final AuthUser user;
  final AuthDevice device;

  VerifyOtpResponse({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
    required this.device,
  });

  factory VerifyOtpResponse.fromJson(Map<String, dynamic> json) => VerifyOtpResponse(
        accessToken: json['accessToken'] as String,
        refreshToken: json['refreshToken'] as String,
        user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
        device: AuthDevice.fromJson(json['device'] as Map<String, dynamic>),
      );
}

class MeResponse {
  final String id;
  final String fullName;
  final String preferredLanguage;
  final String? mobileNumber;

  MeResponse({
    required this.id,
    required this.fullName,
    required this.preferredLanguage,
    this.mobileNumber,
  });

  factory MeResponse.fromJson(Map<String, dynamic> json) => MeResponse(
        id: json['id'] as String,
        fullName: json['fullName'] as String,
        preferredLanguage: json['preferredLanguage'] as String,
        mobileNumber: json['mobileNumber'] as String?,
      );
}

class MyCampaignSummary {
  final String campaignId;
  final String campaignName;
  final String campaignStatus;
  final String clientId;
  final String clientName;
  final String roleId;
  final String roleName;
  final String roleCode;

  MyCampaignSummary({
    required this.campaignId,
    required this.campaignName,
    required this.campaignStatus,
    required this.clientId,
    required this.clientName,
    required this.roleId,
    required this.roleName,
    required this.roleCode,
  });

  factory MyCampaignSummary.fromJson(Map<String, dynamic> json) => MyCampaignSummary(
        campaignId: json['campaignId'] as String,
        campaignName: json['campaignName'] as String,
        campaignStatus: json['campaignStatus'] as String,
        clientId: json['clientId'] as String,
        clientName: json['clientName'] as String,
        roleId: json['roleId'] as String,
        roleName: json['roleName'] as String,
        roleCode: json['roleCode'] as String,
      );
}

class CampaignBrandingTheme {
  final String primaryColor;
  final String secondaryColor;

  CampaignBrandingTheme({required this.primaryColor, required this.secondaryColor});

  factory CampaignBrandingTheme.fromJson(Map<String, dynamic> json) => CampaignBrandingTheme(
        primaryColor: json['primaryColor'] as String? ?? '#1B5E3C',
        secondaryColor: json['secondaryColor'] as String? ?? '#F2A71B',
      );
}

class CampaignBrandingResponse {
  final String campaignId;
  final String campaignName;
  final String clientName;
  final CampaignBrandingTheme theme;
  final String? instructionsText;
  final String? escalationContactName;
  final String? escalationContactPhone;

  CampaignBrandingResponse({
    required this.campaignId,
    required this.campaignName,
    required this.clientName,
    required this.theme,
    this.instructionsText,
    this.escalationContactName,
    this.escalationContactPhone,
  });

  factory CampaignBrandingResponse.fromJson(Map<String, dynamic> json) => CampaignBrandingResponse(
        campaignId: json['campaignId'] as String,
        campaignName: json['campaignName'] as String,
        clientName: json['clientName'] as String,
        theme: CampaignBrandingTheme.fromJson(json['theme'] as Map<String, dynamic>),
        instructionsText: json['instructionsText'] as String?,
        escalationContactName: json['escalationContactName'] as String?,
        escalationContactPhone: json['escalationContactPhone'] as String?,
      );
}
