// The validated set of KPIs a Target can be set against, in the same spirit as the SKU movement-
// type list (report-format-library §3): drawn from what's actually computable from existing data,
// not invented ahead of a real need. Covers the outlet-visit archetype (DFR/Profile/Stock) and the
// lead-capture archetype (Enquiry) — the four report-format archetypes report-format-library.md §1
// documents. Extending this list later means adding a matching case in ReportsService's actual-value
// computation, not just the enum.
export const KPI_KEYS = ['OUTLETS_VISITED', 'UNITS_SOLD', 'SALES_AMOUNT', 'LEADS_CONVERTED'] as const;
export type KpiKey = (typeof KPI_KEYS)[number];

export const KPI_KEY_LABELS: Record<KpiKey, string> = {
  OUTLETS_VISITED: 'Outlets Visited',
  UNITS_SOLD: 'Units Sold',
  SALES_AMOUNT: 'Sales Amount',
  LEADS_CONVERTED: 'Leads Converted',
};
