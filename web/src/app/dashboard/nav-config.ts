// Role-based navigation (spec item 5): each entry is gated by a *permission code*, matching
// exactly what CampaignScopeGuard computes server-side from Role → RolePermission — never a
// hard-coded role name. Every item here is a real Phase C+1 feature module, not yet built, so it
// renders disabled and clearly labeled "soon" rather than linking to a page that doesn't exist
// (CLAUDE.md: "no non-functional major buttons").
export interface NavItem {
  label: string;
  requiredPermission: string;
}

// Real, built nav items — linked pages, gated the same way as NAV_SOON_ITEMS.
export interface LiveNavItem extends NavItem {
  href: string;
}

export const NAV_LIVE_ITEMS: LiveNavItem[] = [
  { label: 'Clients', requiredPermission: 'manage_clients', href: '/dashboard/clients' },
  { label: 'Campaigns', requiredPermission: 'edit', href: '/dashboard/campaigns' },
  { label: 'Forms', requiredPermission: 'manage_forms', href: '/dashboard/forms' },
  { label: 'SKU Master', requiredPermission: 'manage_forms', href: '/dashboard/skus' },
  { label: 'Targets', requiredPermission: 'manage_forms', href: '/dashboard/targets' },
  { label: 'Activity Templates', requiredPermission: 'manage_forms', href: '/dashboard/activity-templates' },
  { label: 'Workflow Builder', requiredPermission: 'manage_forms', href: '/dashboard/workflow' },
  { label: 'PJP Upload', requiredPermission: 'manage_pjp', href: '/dashboard/pjp' },
  { label: 'Assignments', requiredPermission: 'allocate', href: '/dashboard/assignments' },
  { label: 'Approvals', requiredPermission: 'approve', href: '/dashboard/approvals' },
  { label: 'Deviations', requiredPermission: 'approve', href: '/dashboard/deviations' },
  { label: 'Exceptions', requiredPermission: 'approve', href: '/dashboard/exceptions' },
  { label: 'Alerts', requiredPermission: 'approve', href: '/dashboard/alerts' },
  { label: 'Team Dashboard', requiredPermission: 'approve', href: '/dashboard/team' },
  { label: 'Overview', requiredPermission: 'approve', href: '/dashboard/overview' },
  { label: 'Client Dashboard', requiredPermission: 'view', href: '/dashboard/client-dashboard' },
  { label: 'Live Map', requiredPermission: 'approve', href: '/dashboard/live-map' },
  { label: 'Device Risk', requiredPermission: 'block', href: '/dashboard/device-risk' },
  { label: 'Reports', requiredPermission: 'view_reports', href: '/dashboard/reports' },
  { label: 'Readiness', requiredPermission: 'view_reports', href: '/dashboard/readiness' },
];

export const NAV_SOON_ITEMS: NavItem[] = [
  { label: 'User Management', requiredPermission: 'manage_users' },
  { label: 'Audit Logs', requiredPermission: 'audit' },
];
