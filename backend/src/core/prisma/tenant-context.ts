/**
 * Resolved once per request by CampaignScopeGuard and passed explicitly to
 * PrismaService.runInTenantContext(...) by services — never read "magically" from ambient state.
 * Explicit beats implicit here: a reviewer can see exactly which tenant every query ran under by
 * reading the call site, which matters a great deal for a table this security-sensitive
 * (docs/architecture/08 risk #7).
 */
export interface TenantContext {
  clientId: string;
  campaignId: string;
  userId: string;
  roleId: string;
  roleCode: string;
  permissions: string[];
}
