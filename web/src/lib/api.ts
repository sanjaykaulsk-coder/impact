import type {
  ActionTakenRequest,
  ActivityTemplateSummary,
  AlertRecord,
  AlertStatus,
  ApplyActivityTemplateRequest,
  ApprovalDecisionStatus,
  AssignExceptionRequest,
  AssignmentSummary,
  AvailableAssignmentUser,
  AvailablePjpRow,
  CampaignBrandingResponse,
  CancelPjpRowRequest,
  CampaignSkuResponse,
  CampaignSummary,
  ClientDashboardResponse,
  ClientSummary,
  ClosureReportResponse,
  CompleteWhatsAppVerificationRequest,
  CreateAssignmentRequest,
  CreateCampaignRequest,
  CreateClientRequest,
  CreateFormTemplateRequest,
  CreatePjpRequest,
  CreatePjpResponse,
  CreateTargetRequest,
  DashboardSummary,
  DashboardWidgetConfigRow,
  DecideApprovalRequest,
  DecideDeviationRequestRequest,
  DelayedActivityRow,
  DeviationRequestSummary,
  DeviceRiskAlert,
  DfrReportResponse,
  DrillDownResponse,
  ExceptionRecord,
  ExceptionStatus,
  LiveMapPoint,
  FormTemplateDetail,
  FormTemplateSummary,
  MeResponse,
  MyAccessResponse,
  MyCampaignSummary,
  PjpDetail,
  PjpRowHistoryEntry,
  PjpRowInput,
  PjpRowResponse,
  PjpSummary,
  PostponePjpRowRequest,
  ReadinessRow,
  ReassignPjpRowRequest,
  ReopenExceptionRequest,
  RequestOtpResponse,
  ReschedulePjpRowRequest,
  MediaReviewItem,
  ResolveAlertRequest,
  ResolveExceptionRequest,
  RoleSummary,
  SetDashboardConfigRequest,
  StartWhatsAppVerificationRequest,
  StartWhatsAppVerificationResponse,
  StockReconciliationRow,
  SupervisorInboxItem,
  TargetResponse,
  TeamAttendanceRow,
  TeamPerformanceRow,
  TokenPair,
  UnsyncedUserRow,
  UpdateAssignmentRequest,
  UpdateCampaignRequest,
  UpdateClientRequest,
  UpdatePjpRowRequest,
  UpsertBrandingRequest,
  UpsertCampaignSkuRequest,
  UpsertDraftFormRequest,
  UpsertWorkflowRequest,
  VerifyOtpResponse,
  WeeklyReportResponse,
  WhatsAppVerificationRecord,
  WorkflowResponse,
} from '@impact/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

const ACCESS_KEY = 'ifc_access_token';
const REFRESH_KEY = 'ifc_refresh_token';
const DEVICE_KEY = 'ifc_device_fingerprint';

// Phase C simplification: tokens live in localStorage rather than an httpOnly cookie issued by a
// Next.js backend-for-frontend layer. That BFF hardening step is noted in docs/STATE.md as
// follow-up work — acceptable for this foundation phase, not for an internet-facing production
// deployment (spec §36's "secure sessions" bar).
export const tokenStore = {
  get access() {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(REFRESH_KEY);
  },
  set(pair: TokenPair) {
    window.localStorage.setItem(ACCESS_KEY, pair.accessToken);
    window.localStorage.setItem(REFRESH_KEY, pair.refreshToken);
  },
  clear() {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};

/** A stable per-browser identifier standing in for a device fingerprint (spec §7 device binding). */
export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server';
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = 'web-' + crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const access = tokenStore.access;
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401 && retry && tokenStore.refresh) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, init, false);
  }

  // Read as text first: several endpoints (e.g. device-risk clear/block) return 201 with no body
  // at all, not just 204 — calling res.json() directly on an empty body throws "Unexpected end of
  // JSON input", which the caller sees as a generic failure even though the request succeeded.
  const text = await res.text();
  if (!res.ok) {
    let body: { message?: string } = { message: res.statusText };
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        // leave the statusText fallback
      }
    }
    throw new ApiError(res.status, body.message ?? 'Request failed');
  }
  if (!text) return undefined as T;
  return JSON.parse(text);
}

// Excel exports are binary, so they can't go through request<T>()'s JSON parsing — this fetches
// the file with the same bearer-token auth as every other call, then hands the browser a real
// download via a throwaway object URL (no reachable UI element is a plain, unauthenticated <a href>).
async function downloadFile(path: string, filename: string): Promise<void> {
  const access = tokenStore.access;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: access ? { Authorization: `Bearer ${access}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, 'Could not download report');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Refresh tokens rotate server-side (each use invalidates the old one — token.service.ts's
// `rotate()`), so two requests hitting 401 around the same moment (e.g. a page's own background
// reload plus a user's click) must never each call tryRefresh() independently: whichever loses the
// race presents an already-invalidated refresh token, fails, and clears tokenStore — wiping out
// the *winner's* just-issued valid pair and silently logging the user out mid-session. This shared
// in-flight promise makes every concurrent 401 await the same single refresh attempt instead.
let refreshInFlight: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokenStore.refresh }),
    });
    if (!res.ok) {
      tokenStore.clear();
      return false;
    }
    const pair: TokenPair = await res.json();
    tokenStore.set(pair);
    return true;
  } catch {
    tokenStore.clear();
    return false;
  }
}

export const api = {
  requestOtp: (mobileNumber: string) =>
    request<RequestOtpResponse>('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ mobileNumber }),
    }),
  verifyOtp: (challengeId: string, code: string) =>
    request<VerifyOtpResponse>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({
        challengeId,
        code,
        device: { fingerprint: getDeviceFingerprint(), model: 'Web browser', appVersion: '0.1.0' },
      }),
    }),
  logout: () => request('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: tokenStore.refresh }) }),
  me: () => request<MeResponse>('/me'),
  myCampaigns: () => request<MyCampaignSummary[]>('/me/campaigns'),
  campaignBranding: (campaignId: string) =>
    request<CampaignBrandingResponse>(`/campaigns/${campaignId}/branding`),
  myAccess: (campaignId: string) => request<MyAccessResponse>(`/campaigns/${campaignId}/my-access`),
  clients: {
    list: () => request<ClientSummary[]>('/clients'),
    get: (id: string) => request<ClientSummary>(`/clients/${id}`),
    create: (dto: CreateClientRequest) =>
      request<ClientSummary>('/clients', { method: 'POST', body: JSON.stringify(dto) }),
    update: (id: string, dto: UpdateClientRequest) =>
      request<ClientSummary>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  },
  campaignsBuilder: {
    list: () => request<CampaignSummary[]>('/campaigns'),
    create: (dto: CreateCampaignRequest) =>
      request<CampaignSummary>('/campaigns', { method: 'POST', body: JSON.stringify(dto) }),
    update: (campaignId: string, dto: UpdateCampaignRequest) =>
      request<CampaignSummary>(`/campaigns/${campaignId}`, { method: 'PATCH', body: JSON.stringify(dto) }),
    transition: (campaignId: string, toStatus: string) =>
      request<CampaignSummary>(`/campaigns/${campaignId}/transition`, {
        method: 'POST',
        body: JSON.stringify({ toStatus }),
      }),
    upsertBranding: (campaignId: string, dto: UpsertBrandingRequest) =>
      request<CampaignBrandingResponse>(`/campaigns/${campaignId}/branding`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      }),
  },
  forms: {
    list: (campaignId: string) => request<FormTemplateSummary[]>(`/campaigns/${campaignId}/form-templates`),
    create: (campaignId: string, dto: CreateFormTemplateRequest) =>
      request<FormTemplateDetail>(`/campaigns/${campaignId}/form-templates`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    get: (campaignId: string, templateId: string) =>
      request<FormTemplateDetail>(`/campaigns/${campaignId}/form-templates/${templateId}`),
    upsertDraft: (campaignId: string, templateId: string, dto: UpsertDraftFormRequest) =>
      request<FormTemplateDetail>(`/campaigns/${campaignId}/form-templates/${templateId}/draft`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      }),
    publish: (campaignId: string, templateId: string) =>
      request<FormTemplateDetail>(`/campaigns/${campaignId}/form-templates/${templateId}/publish`, {
        method: 'POST',
      }),
    syncSkus: (campaignId: string, templateId: string) =>
      request<FormTemplateDetail>(`/campaigns/${campaignId}/form-templates/${templateId}/sync-skus`, {
        method: 'POST',
      }),
  },
  skus: {
    list: (campaignId: string, includeInactive = false) =>
      request<CampaignSkuResponse[]>(`/campaigns/${campaignId}/skus${includeInactive ? '?includeInactive=true' : ''}`),
    create: (campaignId: string, dto: UpsertCampaignSkuRequest) =>
      request<CampaignSkuResponse>(`/campaigns/${campaignId}/skus`, { method: 'POST', body: JSON.stringify(dto) }),
    update: (campaignId: string, skuId: string, dto: UpsertCampaignSkuRequest) =>
      request<CampaignSkuResponse>(`/campaigns/${campaignId}/skus/${skuId}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
  },
  reports: {
    dfr: (campaignId: string, from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      return request<DfrReportResponse>(`/campaigns/${campaignId}/reports/dfr${qs ? `?${qs}` : ''}`);
    },
    stockReconciliation: (campaignId: string, from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      return request<StockReconciliationRow[]>(
        `/campaigns/${campaignId}/reports/stock-reconciliation${qs ? `?${qs}` : ''}`,
      );
    },
    downloadDfrExcel: (campaignId: string, from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      return downloadFile(`/campaigns/${campaignId}/reports/dfr.xlsx${qs ? `?${qs}` : ''}`, 'DFR.xlsx');
    },
    downloadStockReconciliationExcel: (campaignId: string, from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      return downloadFile(
        `/campaigns/${campaignId}/reports/stock-reconciliation.xlsx${qs ? `?${qs}` : ''}`,
        'Stock-Reconciliation.xlsx',
      );
    },
    weekly: (campaignId: string, from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      return request<WeeklyReportResponse>(`/campaigns/${campaignId}/reports/weekly${qs ? `?${qs}` : ''}`);
    },
    downloadWeeklyExcel: (campaignId: string, from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      return downloadFile(`/campaigns/${campaignId}/reports/weekly.xlsx${qs ? `?${qs}` : ''}`, 'Weekly-Report.xlsx');
    },
    closure: (campaignId: string) => request<ClosureReportResponse>(`/campaigns/${campaignId}/reports/closure`),
    downloadClosureExcel: (campaignId: string) =>
      downloadFile(`/campaigns/${campaignId}/reports/closure.xlsx`, 'Campaign-Closure-Report.xlsx'),
    downloadDfrPdf: (campaignId: string, from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      return downloadFile(`/campaigns/${campaignId}/reports/dfr.pdf${qs ? `?${qs}` : ''}`, 'DFR.pdf');
    },
    downloadStockReconciliationPdf: (campaignId: string, from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      return downloadFile(`/campaigns/${campaignId}/reports/stock-reconciliation.pdf${qs ? `?${qs}` : ''}`, 'Stock-Reconciliation.pdf');
    },
    downloadWeeklyPdf: (campaignId: string, from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      return downloadFile(`/campaigns/${campaignId}/reports/weekly.pdf${qs ? `?${qs}` : ''}`, 'Weekly-Report.pdf');
    },
    downloadClosurePdf: (campaignId: string) =>
      downloadFile(`/campaigns/${campaignId}/reports/closure.pdf`, 'Campaign-Closure-Report.pdf'),
    downloadClosurePpt: (campaignId: string) =>
      downloadFile(`/campaigns/${campaignId}/reports/closure.pptx`, 'Campaign-Closure-Report.pptx'),
  },
  targets: {
    list: (campaignId: string) => request<TargetResponse[]>(`/campaigns/${campaignId}/targets`),
    create: (campaignId: string, dto: CreateTargetRequest) =>
      request<TargetResponse>(`/campaigns/${campaignId}/targets`, { method: 'POST', body: JSON.stringify(dto) }),
    remove: (campaignId: string, targetId: string) =>
      request<{ id: string }>(`/campaigns/${campaignId}/targets/${targetId}`, { method: 'DELETE' }),
  },
  clientDashboard: {
    render: (campaignId: string) => request<ClientDashboardResponse>(`/campaigns/${campaignId}/client-dashboard`),
    getConfig: (campaignId: string) => request<DashboardWidgetConfigRow[]>(`/campaigns/${campaignId}/client-dashboard/config`),
    setConfig: (campaignId: string, dto: SetDashboardConfigRequest) =>
      request<DashboardWidgetConfigRow[]>(`/campaigns/${campaignId}/client-dashboard/config`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      }),
  },
  pjp: {
    list: (campaignId: string) => request<PjpSummary[]>(`/campaigns/${campaignId}/pjps`),
    get: (campaignId: string, pjpId: string) => request<PjpDetail>(`/campaigns/${campaignId}/pjps/${pjpId}`),
    create: (campaignId: string, dto: CreatePjpRequest) =>
      request<CreatePjpResponse>(`/campaigns/${campaignId}/pjps`, { method: 'POST', body: JSON.stringify(dto) }),
    publish: (campaignId: string, pjpId: string) =>
      request<PjpDetail>(`/campaigns/${campaignId}/pjps/${pjpId}/publish`, { method: 'POST' }),
    addManualLocation: (campaignId: string, row: PjpRowInput) =>
      request<PjpDetail>(`/campaigns/${campaignId}/pjps/manual-row`, { method: 'POST', body: JSON.stringify(row) }),
    updateRow: (campaignId: string, pjpId: string, rowId: string, dto: UpdatePjpRowRequest) =>
      request<PjpRowResponse>(`/campaigns/${campaignId}/pjps/${pjpId}/rows/${rowId}`, { method: 'PATCH', body: JSON.stringify(dto) }),
    cancelRow: (campaignId: string, pjpId: string, rowId: string, dto: CancelPjpRowRequest) =>
      request<PjpRowResponse>(`/campaigns/${campaignId}/pjps/${pjpId}/rows/${rowId}/cancel`, { method: 'POST', body: JSON.stringify(dto) }),
    postponeRow: (campaignId: string, pjpId: string, rowId: string, dto: PostponePjpRowRequest) =>
      request<PjpRowResponse>(`/campaigns/${campaignId}/pjps/${pjpId}/rows/${rowId}/postpone`, { method: 'POST', body: JSON.stringify(dto) }),
    rescheduleRow: (campaignId: string, pjpId: string, rowId: string, dto: ReschedulePjpRowRequest) =>
      request<PjpRowResponse>(`/campaigns/${campaignId}/pjps/${pjpId}/rows/${rowId}/reschedule`, { method: 'POST', body: JSON.stringify(dto) }),
    reassignRow: (campaignId: string, pjpId: string, rowId: string, dto: ReassignPjpRowRequest) =>
      request<PjpRowResponse>(`/campaigns/${campaignId}/pjps/${pjpId}/rows/${rowId}/reassign`, { method: 'POST', body: JSON.stringify(dto) }),
    rowHistory: (campaignId: string, pjpId: string, rowId: string) =>
      request<PjpRowHistoryEntry[]>(`/campaigns/${campaignId}/pjps/${pjpId}/rows/${rowId}/history`),
  },
  assignments: {
    list: (campaignId: string) => request<AssignmentSummary[]>(`/campaigns/${campaignId}/assignments`),
    availableUsers: (campaignId: string) =>
      request<AvailableAssignmentUser[]>(`/campaigns/${campaignId}/assignments/available-users`),
    availableRows: (campaignId: string) =>
      request<AvailablePjpRow[]>(`/campaigns/${campaignId}/assignments/available-rows`),
    create: (campaignId: string, dto: CreateAssignmentRequest) =>
      request<AssignmentSummary>(`/campaigns/${campaignId}/assignments`, { method: 'POST', body: JSON.stringify(dto) }),
    update: (campaignId: string, assignmentId: string, dto: UpdateAssignmentRequest) =>
      request<AssignmentSummary>(`/campaigns/${campaignId}/assignments/${assignmentId}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
  },
  supervisor: {
    inbox: (campaignId: string, status: ApprovalDecisionStatus = 'PENDING') =>
      request<SupervisorInboxItem[]>(`/campaigns/${campaignId}/supervisor/inbox?status=${status}`),
    decide: (campaignId: string, approvalId: string, dto: DecideApprovalRequest) =>
      request<SupervisorInboxItem>(`/campaigns/${campaignId}/supervisor/approvals/${approvalId}/decide`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    deviationInbox: (campaignId: string, status: ApprovalDecisionStatus = 'PENDING') =>
      request<DeviationRequestSummary[]>(`/campaigns/${campaignId}/supervisor/deviation-requests?status=${status}`),
    decideDeviation: (campaignId: string, deviationRequestId: string, dto: DecideDeviationRequestRequest) =>
      request<DeviationRequestSummary>(`/campaigns/${campaignId}/supervisor/deviation-requests/${deviationRequestId}/decide`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    escalateDeviation: (campaignId: string, deviationRequestId: string) =>
      request<DeviationRequestSummary>(`/campaigns/${campaignId}/supervisor/deviation-requests/${deviationRequestId}/escalate`, {
        method: 'POST',
      }),
    deviceRiskInbox: (campaignId: string) => request<DeviceRiskAlert[]>(`/campaigns/${campaignId}/supervisor/device-risk`),
    clearDeviceRisk: (campaignId: string, deviceId: string) =>
      request(`/campaigns/${campaignId}/supervisor/device-risk/${deviceId}/clear`, { method: 'POST' }),
    blockDevice: (campaignId: string, deviceId: string) =>
      request(`/campaigns/${campaignId}/supervisor/device-risk/${deviceId}/block`, { method: 'POST' }),
    mediaReview: (campaignId: string, flaggedOnly: boolean) =>
      request<MediaReviewItem[]>(`/campaigns/${campaignId}/supervisor/media-review?flaggedOnly=${flaggedOnly}`),
  },
  teamDashboard: {
    attendance: (campaignId: string, date?: string) =>
      request<TeamAttendanceRow[]>(`/campaigns/${campaignId}/team-dashboard/attendance${date ? `?date=${date}` : ''}`),
    unsyncedUsers: (campaignId: string, thresholdHours?: number) =>
      request<UnsyncedUserRow[]>(
        `/campaigns/${campaignId}/team-dashboard/unsynced-users${thresholdHours ? `?thresholdHours=${thresholdHours}` : ''}`,
      ),
    delayedActivities: (campaignId: string, date?: string) =>
      request<DelayedActivityRow[]>(`/campaigns/${campaignId}/team-dashboard/delayed-activities${date ? `?date=${date}` : ''}`),
    performance: (campaignId: string, from?: string, to?: string) =>
      request<TeamPerformanceRow[]>(
        `/campaigns/${campaignId}/team-dashboard/performance${from ? `?from=${from}${to ? `&to=${to}` : ''}` : ''}`,
      ),
  },
  exceptions: {
    list: (campaignId: string, status?: ExceptionStatus) =>
      request<ExceptionRecord[]>(`/campaigns/${campaignId}/exceptions${status ? `?status=${status}` : ''}`),
    detail: (campaignId: string, exceptionId: string) => request<ExceptionRecord>(`/campaigns/${campaignId}/exceptions/${exceptionId}`),
    assign: (campaignId: string, exceptionId: string, dto: AssignExceptionRequest) =>
      request<ExceptionRecord>(`/campaigns/${campaignId}/exceptions/${exceptionId}/assign`, { method: 'POST', body: JSON.stringify(dto) }),
    acknowledge: (campaignId: string, exceptionId: string) =>
      request<ExceptionRecord>(`/campaigns/${campaignId}/exceptions/${exceptionId}/acknowledge`, { method: 'POST' }),
    startReview: (campaignId: string, exceptionId: string) =>
      request<ExceptionRecord>(`/campaigns/${campaignId}/exceptions/${exceptionId}/start-review`, { method: 'POST' }),
    actionTaken: (campaignId: string, exceptionId: string, dto: ActionTakenRequest) =>
      request<ExceptionRecord>(`/campaigns/${campaignId}/exceptions/${exceptionId}/action-taken`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    resolve: (campaignId: string, exceptionId: string, dto: ResolveExceptionRequest) =>
      request<ExceptionRecord>(`/campaigns/${campaignId}/exceptions/${exceptionId}/resolve`, { method: 'POST', body: JSON.stringify(dto) }),
    approveClosure: (campaignId: string, exceptionId: string) =>
      request<ExceptionRecord>(`/campaigns/${campaignId}/exceptions/${exceptionId}/approve-closure`, { method: 'POST' }),
    reopen: (campaignId: string, exceptionId: string, dto: ReopenExceptionRequest) =>
      request<ExceptionRecord>(`/campaigns/${campaignId}/exceptions/${exceptionId}/reopen`, { method: 'POST', body: JSON.stringify(dto) }),
    escalate: (campaignId: string, exceptionId: string) =>
      request<ExceptionRecord>(`/campaigns/${campaignId}/exceptions/${exceptionId}/escalate`, { method: 'POST' }),
  },
  alerts: {
    list: (campaignId: string, status?: AlertStatus) => request<AlertRecord[]>(`/campaigns/${campaignId}/alerts${status ? `?status=${status}` : ''}`),
    acknowledge: (campaignId: string, alertId: string) =>
      request<AlertRecord>(`/campaigns/${campaignId}/alerts/${alertId}/acknowledge`, { method: 'POST' }),
    resolve: (campaignId: string, alertId: string, dto: ResolveAlertRequest) =>
      request<AlertRecord>(`/campaigns/${campaignId}/alerts/${alertId}/resolve`, { method: 'POST', body: JSON.stringify(dto) }),
    escalate: (campaignId: string, alertId: string) =>
      request<AlertRecord>(`/campaigns/${campaignId}/alerts/${alertId}/escalate`, { method: 'POST' }),
  },
  whatsappVerification: {
    history: (campaignId: string, activityInstanceId: string) =>
      request<WhatsAppVerificationRecord[]>(`/campaigns/${campaignId}/activity-instances/${activityInstanceId}/whatsapp-verification`),
    start: (campaignId: string, activityInstanceId: string, dto: StartWhatsAppVerificationRequest) =>
      request<StartWhatsAppVerificationResponse>(`/campaigns/${campaignId}/activity-instances/${activityInstanceId}/whatsapp-verification/start`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    complete: (campaignId: string, verificationId: string, dto: CompleteWhatsAppVerificationRequest) =>
      request<WhatsAppVerificationRecord>(`/campaigns/${campaignId}/whatsapp-verification/${verificationId}/complete`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
  },
  workflow: {
    get: (campaignId: string) => request<WorkflowResponse | null>(`/campaigns/${campaignId}/workflow`),
    upsert: (campaignId: string, dto: UpsertWorkflowRequest) =>
      request<WorkflowResponse>(`/campaigns/${campaignId}/workflow`, { method: 'PUT', body: JSON.stringify(dto) }),
    roles: (campaignId: string) => request<RoleSummary[]>(`/campaigns/${campaignId}/workflow/roles`),
    readiness: (campaignId: string, date?: string) =>
      request<ReadinessRow[]>(`/campaigns/${campaignId}/workflow/readiness${date ? `?date=${date}` : ''}`),
  },
  activityTemplates: {
    list: (campaignId: string) => request<ActivityTemplateSummary[]>(`/campaigns/${campaignId}/activity-templates`),
    apply: (campaignId: string, dto: ApplyActivityTemplateRequest) =>
      request<WorkflowResponse>(`/campaigns/${campaignId}/activity-templates/apply`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
  },
  dashboard: {
    summary: (campaignId: string, date?: string) =>
      request<DashboardSummary>(`/campaigns/${campaignId}/dashboard/summary${date ? `?date=${date}` : ''}`),
    drillDown: (campaignId: string, params: { state?: string; district?: string; tehsil?: string; locationName?: string; activityInstanceId?: string }) => {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value) query.set(key, value);
      }
      const qs = query.toString();
      return request<DrillDownResponse>(`/campaigns/${campaignId}/dashboard/drill-down${qs ? `?${qs}` : ''}`);
    },
    liveMap: (campaignId: string, date?: string) => request<LiveMapPoint[]>(`/campaigns/${campaignId}/dashboard/live-map${date ? `?date=${date}` : ''}`),
  },
};

export { ApiError };
