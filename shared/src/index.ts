// Shared API contract types between backend, web and app. Hand-maintained to mirror the NestJS
// DTOs/response shapes in backend/src/modules/**; there is no code generation step in Phase C, so
// when a backend response shape changes, update this file in the same commit.

export type Language = 'EN' | 'HI';

export type CampaignStatus =
  | 'DRAFT'
  | 'CONFIGURATION_IN_PROGRESS'
  | 'READY_FOR_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'LIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ARCHIVED';

export type DeviceStatus = 'ACTIVE' | 'PENDING_APPROVAL' | 'BLOCKED';

// -- POST /auth/otp/request --------------------------------------------------------------------
export interface RequestOtpRequest {
  mobileNumber: string;
  countryCode?: string;
}

export interface RequestOtpResponse {
  challengeId: string;
  expiresAt: string;
  otpProvider: string;
  /** Present only when the MOCK provider is active (never in a real deployment). */
  devOtpCode?: string;
}

// -- POST /auth/otp/verify -----------------------------------------------------------------------
export interface DeviceInfo {
  fingerprint: string;
  model?: string;
  osVersion?: string;
  appVersion?: string;
}

export interface VerifyOtpRequest {
  challengeId: string;
  code: string;
  device: DeviceInfo;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

export interface VerifyOtpResponse extends TokenPair {
  user: { id: string; fullName: string; preferredLanguage: Language };
  device: { id: string; status: DeviceStatus };
}

// -- GET /me ---------------------------------------------------------------------------------
export interface MeResponse {
  id: string;
  fullName: string;
  preferredLanguage: Language;
  mobileNumber: string | null;
  lastLoginAt: string | null;
}

// -- GET /me/campaigns -----------------------------------------------------------------------
export interface MyCampaignSummary {
  campaignId: string;
  campaignName: string;
  campaignStatus: CampaignStatus;
  clientId: string;
  clientName: string;
  clientLogoUrl: string | null;
  roleId: string;
  roleName: string;
  roleCode: string;
  brandingSummary: { logoUrl: string | null; primaryColor: unknown } | null;
}

// -- GET /campaigns/:campaignId/my-access -----------------------------------------------------
export interface MyAccessResponse {
  roleId: string;
  roleCode: string;
  roleName: string;
  permissions: string[];
}

// -- GET /campaigns/:campaignId/branding ------------------------------------------------------
export interface CampaignBrandingResponse {
  campaignId: string;
  campaignName: string;
  clientName: string;
  version: number;
  theme: { primaryColor: string; secondaryColor: string; mode: string };
  logoUrl: string | null;
  campaignLogoUrl: string | null;
  homeBannerUrl: string | null;
  instructionsText: string | null;
  escalationContactName: string | null;
  escalationContactPhone: string | null;
}

// -- /clients (platform-level, gated by PlatformPermissionGuard) -----------------------------
export type ClientStatus = 'ACTIVE' | 'INACTIVE';

export interface ClientSummary {
  id: string;
  organisationId: string;
  name: string;
  code: string;
  logoUrl: string | null;
  brandColorPrimary: string | null;
  brandColorSecondary: string | null;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
  _count: { campaigns: number };
}

export interface CreateClientRequest {
  name: string;
  code: string;
  logoUrl?: string;
  brandColorPrimary?: string;
  brandColorSecondary?: string;
}

export interface UpdateClientRequest {
  name?: string;
  logoUrl?: string;
  brandColorPrimary?: string;
  brandColorSecondary?: string;
  status?: ClientStatus;
}

// -- /campaigns (builder essentials) ----------------------------------------------------------
export interface CampaignSummary {
  id: string;
  clientId: string;
  client: { id: string; name: string; code: string };
  name: string;
  code: string;
  status: CampaignStatus;
  reportingLanguage: Language;
  startDate: string;
  endDate: string | null;
  deviationToleranceMeters: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignRequest {
  clientId: string;
  name: string;
  code: string;
  reportingLanguage?: Language;
  startDate: string;
  endDate?: string;
  deviationToleranceMeters?: number;
}

export interface UpdateCampaignRequest {
  name?: string;
  reportingLanguage?: Language;
  startDate?: string;
  endDate?: string;
  deviationToleranceMeters?: number;
}

export interface UpsertBrandingRequest {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  campaignLogoUrl?: string;
  homeBannerUrl?: string;
  instructionsText?: string;
  escalationContactName?: string;
  escalationContactPhone?: string;
}

// -- /campaigns/:campaignId/form-templates (minimal form builder) ----------------------------
// Mirrors the schema's full field-type list (backend/prisma/schema.prisma FieldType); the web
// builder only offers a curated "core" subset as buttons — the rest, and the Campaign SKU
// Master, are Stage 3.1 per docs/architecture/09-mvp-build-sequence.md.
export type FieldType =
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'INTEGER'
  | 'DECIMAL'
  | 'CURRENCY'
  | 'PERCENTAGE'
  | 'DATE'
  | 'TIME'
  | 'DATETIME'
  | 'DROPDOWN'
  | 'RADIO'
  | 'MULTI_SELECT'
  | 'CHECKBOX'
  | 'YES_NO'
  | 'RATING'
  | 'PHOTO'
  | 'MULTIPLE_PHOTOS'
  | 'SHORT_VIDEO'
  | 'SIGNATURE'
  | 'DOCUMENT'
  | 'GPS'
  | 'AUTO_TIMESTAMP'
  | 'AUTO_USER'
  | 'AUTO_ACTIVITY_ID'
  | 'AUTO_CAMPAIGN_ID'
  | 'AUTO_LOCATION'
  | 'SKU_SELECTOR'
  | 'QUANTITY'
  | 'MEASUREMENT'
  | 'SALES_VALUE';

export type ConditionalAction = 'SHOW' | 'HIDE' | 'REQUIRE' | 'OPTIONAL';
export type FormVersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface QuestionOptionResponse {
  id: string;
  label: string;
  value: string;
  order: number;
}

export interface FormQuestionResponse {
  id: string;
  fieldType: FieldType;
  label: string;
  helpText: string | null;
  order: number;
  isMandatory: boolean;
  options: QuestionOptionResponse[];
}

export interface FormSectionResponse {
  id: string;
  title: string;
  order: number;
  questions: FormQuestionResponse[];
}

export interface ConditionalRuleResponse {
  id: string;
  triggerQuestionId: string;
  triggerValueJson: unknown;
  action: ConditionalAction;
  targetQuestionId: string;
}

export interface FormVersionResponse {
  id: string;
  version: number;
  status: FormVersionStatus;
  publishedAt: string | null;
  sections: FormSectionResponse[];
  conditionalRules: ConditionalRuleResponse[];
}

export interface FormTemplateSummary {
  id: string;
  name: string;
  code: string;
  description: string | null;
  versions: { id: string; version: number; status: FormVersionStatus }[];
}

export interface FormTemplateDetail {
  id: string;
  name: string;
  code: string;
  description: string | null;
  versions: FormVersionResponse[];
}

export interface CreateFormTemplateRequest {
  name: string;
  description?: string;
}

export interface UpsertDraftQuestionOption {
  label: string;
  value: string;
  order: number;
}

export interface UpsertDraftQuestion {
  key: string;
  fieldType: FieldType;
  label: string;
  helpText?: string;
  order: number;
  isMandatory: boolean;
  options?: UpsertDraftQuestionOption[];
}

export interface UpsertDraftSection {
  title: string;
  order: number;
  questions: UpsertDraftQuestion[];
}

export interface UpsertDraftConditionalRule {
  triggerQuestionKey: string;
  triggerValueJson: unknown;
  action: ConditionalAction;
  targetQuestionKey: string;
}

export interface UpsertDraftFormRequest {
  sections: UpsertDraftSection[];
  conditionalRules?: UpsertDraftConditionalRule[];
}
