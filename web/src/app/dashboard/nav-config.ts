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
  { label: 'PJP Upload', requiredPermission: 'manage_pjp', href: '/dashboard/pjp' },
];

export const NAV_SOON_ITEMS: NavItem[] = [
  { label: 'User Management', requiredPermission: 'manage_users' },
  { label: 'Approvals', requiredPermission: 'approve' },
  { label: 'Reports & Dashboards', requiredPermission: 'view_reports' },
  { label: 'Device Risk', requiredPermission: 'block' },
  { label: 'Audit Logs', requiredPermission: 'audit' },
];
