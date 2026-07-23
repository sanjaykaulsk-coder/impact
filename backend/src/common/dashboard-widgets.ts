// Configurable dashboard engine (spec §26, Post-MVP backlog — docs/ASSUMPTIONS.md A-074): the
// validated widget catalog an Impact admin picks from per campaign. Every widget reuses data
// already computed elsewhere (DashboardService.summary, ReportsService.closure/weekly) — no new
// aggregation, same "validated list, not invented" discipline as SKU movement types/KPI_KEYS.
export const DASHBOARD_WIDGET_KEYS = [
  'TODAY_SUMMARY',
  'GEOGRAPHY_COVERAGE',
  'PLANNED_VS_EXECUTED',
  'KPI_ACHIEVEMENT',
  'SALES_AND_TRIALS',
  'LEADS',
  'ACTIVITY_COMPLETION',
  'EVIDENCE',
  'ROUTE_COMPLIANCE',
  'STATE_COMPARISON',
  'TEAM_PERFORMANCE',
  'DATA_QUALITY',
  'OPEN_EXCEPTIONS_BY_CATEGORY',
] as const;
export type DashboardWidgetKey = (typeof DASHBOARD_WIDGET_KEYS)[number];

export const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetKey, string> = {
  TODAY_SUMMARY: "Today's Summary",
  GEOGRAPHY_COVERAGE: 'Geography Covered',
  PLANNED_VS_EXECUTED: 'Planned vs Executed',
  KPI_ACHIEVEMENT: 'Target vs Achievement',
  SALES_AND_TRIALS: 'Sales & Trials',
  LEADS: 'Leads',
  ACTIVITY_COMPLETION: 'Activity Completion',
  EVIDENCE: 'Evidence Captured',
  ROUTE_COMPLIANCE: 'Route Compliance',
  STATE_COMPARISON: 'State Comparison',
  TEAM_PERFORMANCE: 'Team Performance',
  DATA_QUALITY: 'Data Quality',
  OPEN_EXCEPTIONS_BY_CATEGORY: 'Open Issues by Category',
};
