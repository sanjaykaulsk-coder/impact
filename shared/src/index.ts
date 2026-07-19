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
// Mirrors the schema's full field-type list (backend/prisma/schema.prisma FieldType). As of
// Stage 3.1 the web builder offers the full palette, grouped by category.
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
  | 'AUTO_CALCULATED'
  | 'SKU_SELECTOR'
  | 'QUANTITY'
  | 'MEASUREMENT'
  | 'SALES_VALUE'
  | 'STOCK_VALUE'
  | 'RETAILER_DETAILS'
  | 'CONSUMER_DETAILS'
  | 'REMARKS'
  | 'APPROVAL_STATUS';

export type ConditionalAction = 'SHOW' | 'HIDE' | 'REQUIRE' | 'OPTIONAL';
export type FormVersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface QuestionOptionResponse {
  id: string;
  label: string;
  value: string;
  order: number;
}

export interface ValidationRuleResponse {
  id: string;
  ruleType: string;
  configJson: Record<string, unknown>;
}

// A question bound to one Campaign SKU Master row (report-format-library §3): its numeric answer
// becomes one SkuMovement row at submission time. Lives inside controlsJson under key "skuBinding".
export interface SkuBinding {
  campaignSkuId: string;
  movementType: SkuMovementType;
  metric: 'QUANTITY' | 'AMOUNT';
}

export interface FormQuestionResponse {
  id: string;
  fieldType: FieldType;
  label: string;
  helpText: string | null;
  order: number;
  isMandatory: boolean;
  options: QuestionOptionResponse[];
  controlsJson?: Record<string, unknown>;
  formulaExpression?: string | null;
  defaultValueJson?: unknown;
  dependsOnQuestionId?: string | null;
  validationRules?: ValidationRuleResponse[];
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

export type FormArchetype = 'DFR' | 'PROFILE' | 'STOCK_RECONCILIATION' | 'ENQUIRY_LEADS';

export interface FormTemplateSummary {
  id: string;
  name: string;
  code: string;
  description: string | null;
  archetype?: FormArchetype | null;
  versions: { id: string; version: number; status: FormVersionStatus }[];
}

export interface FormTemplateDetail {
  id: string;
  name: string;
  code: string;
  description: string | null;
  archetype?: FormArchetype | null;
  versions: FormVersionResponse[];
}

export interface CreateFormTemplateRequest {
  name: string;
  description?: string;
  archetype?: FormArchetype;
}

export interface UpsertDraftQuestionOption {
  label: string;
  value: string;
  order: number;
}

export interface UpsertDraftValidationRule {
  ruleType: string;
  configJson: Record<string, unknown>;
}

export interface UpsertDraftQuestion {
  key: string;
  fieldType: FieldType;
  label: string;
  helpText?: string;
  order: number;
  isMandatory: boolean;
  options?: UpsertDraftQuestionOption[];
  controlsJson?: Record<string, unknown>;
  formulaExpression?: string;
  defaultValueJson?: unknown;
  dependsOnQuestionKey?: string;
  validationRules?: UpsertDraftValidationRule[];
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

// -- /campaigns/:campaignId/pjps (PJP upload) --------------------------------------------------
export type PjpStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type PjpRowStatus = 'ACTIVE' | 'CANCELLED' | 'POSTPONED' | 'RESCHEDULED';

export interface PjpRowResponse {
  id: string;
  date: string;
  stateName: string;
  districtName: string;
  tehsilName: string;
  locationName: string;
  latitude: string | null;
  longitude: string | null;
  contactPerson: string | null;
  remarks: string | null;
  status: PjpRowStatus;
  plannedSequence: number | null;
  supervisorUserId: string | null;
  supervisorName: string | null;
}

// -- PJP row management (S3.4: edit/cancel/postpone/reschedule/reassign, full change history) ---
export interface UpdatePjpRowRequest {
  locationName?: string;
  latitude?: number;
  longitude?: number;
  contactPerson?: string;
  remarks?: string;
  plannedSequence?: number;
  reason?: string;
}

export interface CancelPjpRowRequest {
  reason?: string;
}

export interface PostponePjpRowRequest {
  newDate: string;
  reason?: string;
}

export interface ReschedulePjpRowRequest {
  newDate: string;
  reason?: string;
}

export interface ReassignPjpRowRequest {
  supervisorUserId: string;
  reason?: string;
}

export interface PjpRowHistoryEntry {
  id: string;
  action: string;
  before: unknown;
  after: unknown;
  actorUserId: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface PjpSummary {
  id: string;
  fileName: string;
  status: PjpStatus;
  totalRows: number;
  invalidRows: number;
  publishedAt: string | null;
  createdAt: string;
}

export interface PjpDetail extends PjpSummary {
  rows: PjpRowResponse[];
}

export interface PjpInvalidRowDetail {
  rowIndex: number;
  reasons: string[];
}

export interface CreatePjpResponse extends PjpDetail {
  invalidRowDetails: PjpInvalidRowDetail[];
}

export interface PjpRowInput {
  date?: string;
  stateName?: string;
  districtName?: string;
  tehsilName?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  contactPerson?: string;
  remarks?: string;
}

export interface CreatePjpRequest {
  fileName: string;
  rows: PjpRowInput[];
}

// -- /campaigns/:campaignId/assignments ---------------------------------------------------------
export type AssignmentStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface AssignmentSummary {
  id: string;
  userId: string;
  userFullName: string | null;
  teamId: string | null;
  team: { id: string; name: string } | null;
  pjpRowId: string | null;
  pjpRow: { id: string; date: string; locationName: string; stateName: string; districtName: string } | null;
  assignmentDate: string;
  status: AssignmentStatus;
  createdAt: string;
}

export interface AvailableAssignmentUser {
  userId: string;
  fullName: string;
  roleName: string;
}

export interface AvailablePjpRow {
  id: string;
  date: string;
  locationName: string;
  stateName: string;
  districtName: string;
  tehsilName: string;
}

export interface CreateAssignmentRequest {
  userId: string;
  pjpRowId?: string;
  teamId?: string;
  assignmentDate: string;
}

export interface UpdateAssignmentRequest {
  status?: AssignmentStatus;
  userId?: string;
  teamId?: string;
}

// -- /campaigns/:campaignId/supervisor -----------------------------------------------------------
// Spec §25/§44 scenario 5: "reviews media and GPS, approves/rejects with remarks." Scoped to that
// for Session C — not the full supervisor module (team dashboard, live map, exceptions are later).
export type ApprovalDecisionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SupervisorGpsEvent {
  latitude: string;
  longitude: string;
  deviceTimestamp: string;
  distanceFromPlannedMeters?: string | null;
}

export interface SupervisorMediaItem {
  id: string;
  url: string;
  latitude: string | null;
  longitude: string | null;
  capturedAt: string | null;
}

export interface SupervisorFormAnswer {
  questionLabel: string;
  valueJson: unknown;
}

export interface SupervisorInboxItem {
  approvalId: string;
  status: ApprovalDecisionStatus;
  remarks: string | null;
  decidedAt: string | null;
  decidedByName: string | null;
  createdAt: string;
  activity: {
    id: string;
    status: string;
    locationName: string;
    assignedUserName: string;
  };
  checkIn: SupervisorGpsEvent | null;
  checkOut: SupervisorGpsEvent | null;
  media: SupervisorMediaItem[];
  formResponses: SupervisorFormAnswer[];
}

export interface DecideApprovalRequest {
  decision: 'APPROVED' | 'REJECTED';
  remarks?: string;
}

// ---------------------------------------------------------------------------------------------
// Stage 3.1 — Campaign SKU Master + reports (report-format-library §§1-3)
// ---------------------------------------------------------------------------------------------

export type SkuMovementType =
  | 'OPENING_STOCK'
  | 'RECEIVED'
  | 'SOLD'
  | 'FREE_SCHEME'
  | 'SAMPLED'
  | 'DAMAGED'
  | 'CLOSING_STOCK_ACTUAL';

export interface CampaignSkuResponse {
  id: string;
  skuCode: string;
  name: string;
  variantLabel: string | null;
  category: string | null;
  mrp: string | number | null;
  sellingPrice: string | number | null;
  packSize: string | null;
  isActive: boolean;
}

export interface UpsertCampaignSkuRequest {
  skuCode?: string;
  name?: string;
  variantLabel?: string;
  category?: string;
  mrp?: number;
  sellingPrice?: number;
  packSize?: string;
  isActive?: boolean;
}

export interface DfrReportSku {
  id: string;
  skuCode: string;
  name: string;
  variantLabel: string | null;
  category: string | null;
  isActive: boolean;
}

export interface DfrReportRow {
  date: string;
  locationId: string | null;
  locationName: string | null;
  recordCount: number;
  cells: Record<string, { quantity: number; amount: number }>;
  totalQuantity: number;
  totalAmount: number;
}

export interface DfrReportResponse {
  skus: DfrReportSku[];
  rows: DfrReportRow[];
  grandTotalQuantity: number;
  grandTotalAmount: number;
}

export interface StockReconciliationRow {
  sku: { id: string; skuCode: string; name: string; variantLabel: string | null; isActive: boolean };
  openingStock: number;
  received: number;
  soldQuantity: number;
  soldAmount: number;
  freeSchemeQuantity: number;
  freeSchemeValue: number;
  sampled: number;
  damaged: number;
  expectedClosing: number;
  actualClosing: number | null;
  mismatch: number | null;
}

// ---------------------------------------------------------------------------------------------
// Stage 3.2 — Workflow builder + milestone engine + SOP checklists (spec §§11, 12, 16)
// ---------------------------------------------------------------------------------------------

export type SopItemStatus = 'PENDING' | 'COMPLETED' | 'NOT_APPLICABLE';

export interface RoleSummary {
  code: string;
  name: string;
  category: string;
}

export interface SopChecklistItemInput {
  label: string;
  order: number;
  isMandatory: boolean;
}

export interface SopChecklistItemResponse {
  id: string;
  label: string;
  order: number;
  isMandatory: boolean;
}

export interface MilestoneInput {
  name: string;
  order: number;
  formVersionId?: string;
  mandatoryPhotoCount: number;
  mandatoryGps: boolean;
  mandatorySignature: boolean;
  kpiKey?: string;
}

export interface MilestoneResponse {
  id: string;
  name: string;
  order: number;
  formVersionId: string | null;
  mandatoryPhotoCount: number;
  mandatoryGps: boolean;
  mandatorySignature: boolean;
  kpiKey: string | null;
}

export interface StageInput {
  name: string;
  order: number;
  allowIncompletePreparation: boolean;
  milestones: MilestoneInput[];
  assignedRoleCodes?: string[];
  requiresApproval: boolean;
  approverRoleCode?: string;
  sopChecklistItems?: SopChecklistItemInput[];
}

export interface StageResponse {
  id: string;
  name: string;
  order: number;
  allowIncompletePreparation: boolean;
  milestones: MilestoneResponse[];
  stageAssignments: { role: { code: string; name: string } }[];
  stageApprovalRules: { requiresApproval: boolean; approverRole: { code: string; name: string } | null }[];
  sopChecklistItems: SopChecklistItemResponse[];
}

export interface UpsertWorkflowRequest {
  name: string;
  stages: StageInput[];
}

export interface WorkflowResponse {
  id: string;
  name: string;
  stages: StageResponse[];
}

export interface ReadinessItemStatus {
  id: string;
  label: string;
  isMandatory: boolean;
  status: SopItemStatus;
}

export type ReadinessStatus = 'COMPLETED' | 'PENDING' | 'AT_RISK' | 'DELAYED' | 'NOT_APPLICABLE';

export interface ReadinessRow {
  activityInstanceId: string;
  assignedUserName: string;
  locationName: string;
  stageName: string | null;
  activityStatus: string;
  status: ReadinessStatus;
  percentComplete: number | null;
  resolvedCount: number;
  totalCount: number;
  items: ReadinessItemStatus[];
}

export interface MarkSopItemRequest {
  status: 'COMPLETED' | 'NOT_APPLICABLE';
  remarks?: string;
}

// ---------------------------------------------------------------------------------------------
// Stage 3.3 — Activity template library (spec §9.4)
// ---------------------------------------------------------------------------------------------

export interface ActivityTemplateSummary {
  id: string;
  name: string;
  code: string;
  description: string | null;
  activityType: { id: string; name: string; code: string; isCustom: boolean };
}

export interface ApplyActivityTemplateRequest {
  activityTemplateId: string;
}
