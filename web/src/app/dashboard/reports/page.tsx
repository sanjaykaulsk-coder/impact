'use client';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ClosureReportResponse, DfrReportResponse, StockReconciliationRow, WeeklyReportResponse } from '@impact/shared';
import React, { useCallback, useEffect, useState } from 'react';

// DFR/Stock/Weekly are rollup queries over record-level captures (report-format-library §2) —
// every number is computed from the field team's submissions, never separately typed. Closure
// spans the campaign's full lifetime and has no date range. Nothing on this page is editable.

type Tab = 'DFR' | 'STOCK' | 'WEEKLY' | 'CLOSURE';

const fmt = (n: number) =>
  n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
      <span className="subtitle">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function ReportsPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [tab, setTab] = useState<Tab>('DFR');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [dfr, setDfr] = useState<DfrReportResponse | null>(null);
  const [stock, setStock] = useState<StockReconciliationRow[] | null>(null);
  const [weekly, setWeekly] = useState<WeeklyReportResponse | null>(null);
  const [closure, setClosure] = useState<ClosureReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);

  const downloadExcel = useCallback(() => {
    if (!selectedCampaignId) return;
    setError(null);
    setDownloading(true);
    const request =
      tab === 'DFR'
        ? api.reports.downloadDfrExcel(selectedCampaignId, from || undefined, to || undefined)
        : tab === 'STOCK'
          ? api.reports.downloadStockReconciliationExcel(selectedCampaignId, from || undefined, to || undefined)
          : tab === 'WEEKLY'
            ? api.reports.downloadWeeklyExcel(selectedCampaignId, from || undefined, to || undefined)
            : api.reports.downloadClosureExcel(selectedCampaignId);
    request
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not download report'))
      .finally(() => setDownloading(false));
  }, [selectedCampaignId, tab, from, to]);

  const load = useCallback(() => {
    if (!selectedCampaignId) return;
    setError(null);
    setLoading(true);
    const request =
      tab === 'DFR'
        ? api.reports.dfr(selectedCampaignId, from || undefined, to || undefined).then(setDfr)
        : tab === 'STOCK'
          ? api.reports.stockReconciliation(selectedCampaignId, from || undefined, to || undefined).then(setStock)
          : tab === 'WEEKLY'
            ? api.reports.weekly(selectedCampaignId, from || undefined, to || undefined).then(setWeekly)
            : api.reports.closure(selectedCampaignId).then(setClosure);
    request
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load report'))
      .finally(() => setLoading(false));
  }, [selectedCampaignId, tab, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const dfrSkus = dfr?.skus.filter((s) => s.isActive || dfr.rows.some((r) => r.cells[s.id])) ?? [];

  return (
    <div>
      <div className="toolbar">
        <h1>Reports {activeCampaign ? `— ${activeCampaign.campaignName}` : ''}</h1>
      </div>

      <div className="panel-actions" style={{ marginBottom: 12 }}>
        <button className={tab === 'DFR' ? 'btn-primary inline' : 'btn-secondary'} onClick={() => setTab('DFR')}>
          Daily Field Report (DFR)
        </button>
        <button className={tab === 'STOCK' ? 'btn-primary inline' : 'btn-secondary'} onClick={() => setTab('STOCK')}>
          Stock Reconciliation
        </button>
        <button className={tab === 'WEEKLY' ? 'btn-primary inline' : 'btn-secondary'} onClick={() => setTab('WEEKLY')}>
          Weekly Report
        </button>
        <button className={tab === 'CLOSURE' ? 'btn-primary inline' : 'btn-secondary'} onClick={() => setTab('CLOSURE')}>
          Campaign Closure Report
        </button>
      </div>

      <div className="panel">
        <div className="form-grid">
          {tab !== 'CLOSURE' && (
            <>
              <div className="field">
                <label>From</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="field">
                <label>To</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </>
          )}
          <div className="field" style={{ alignSelf: 'flex-end' }}>
            <button className="btn-secondary" onClick={downloadExcel} disabled={downloading || !selectedCampaignId}>
              {downloading ? 'Preparing…' : 'Download Excel'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="subtitle">Loading…</p>}

      {tab === 'DFR' && dfr && !loading && (
        <>
          <p className="subtitle">
            Every number below is computed from the field team’s record-level submissions — the DFR
            is a rollup, never separately typed.
          </p>
          {dfr.rows.length === 0 ? (
            <p className="subtitle">No sales captured in this period yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Records</th>
                    {dfrSkus.map((s) => (
                      <th key={s.id} colSpan={2}>
                        {s.name}
                        {s.variantLabel ? ` (${s.variantLabel})` : ''}
                      </th>
                    ))}
                    <th>Total Qty</th>
                    <th>Total Sales Amt.</th>
                  </tr>
                  <tr>
                    <th />
                    <th />
                    <th />
                    {dfrSkus.map((s) => (
                      <React.Fragment key={s.id}>
                        <th>Qty</th>
                        <th>Amt.</th>
                      </React.Fragment>
                    ))}
                    <th />
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {dfr.rows.map((row) => (
                    <tr key={`${row.date}-${row.locationId}`}>
                      <td>{row.date}</td>
                      <td>{row.locationName ?? '—'}</td>
                      <td>{row.recordCount}</td>
                      {dfrSkus.map((s) => (
                        <React.Fragment key={s.id}>
                          <td>{row.cells[s.id] ? fmt(row.cells[s.id].quantity) : '0'}</td>
                          <td>{row.cells[s.id] ? `₹${fmt(row.cells[s.id].amount)}` : '₹0'}</td>
                        </React.Fragment>
                      ))}
                      <td>
                        <strong>{fmt(row.totalQuantity)}</strong>
                      </td>
                      <td>
                        <strong>₹{fmt(row.totalAmount)}</strong>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3 + dfrSkus.length * 2}>
                      <strong>Grand total</strong>
                    </td>
                    <td>
                      <strong>{fmt(dfr.grandTotalQuantity)}</strong>
                    </td>
                    <td>
                      <strong>₹{fmt(dfr.grandTotalAmount)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'STOCK' && stock && !loading && (
        <>
          <p className="subtitle">
            Expected closing = Opening + Received − Sold − Sampled − Damaged (spec §22). A mismatch
            against the physical count raises an exception automatically at submission time.
          </p>
          {stock.length === 0 ? (
            <p className="subtitle">No SKUs in this campaign yet — add them under SKU Master.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Opening</th>
                    <th>Received</th>
                    <th>Sold Qty</th>
                    <th>Sold Amt.</th>
                    <th>Scheme Qty</th>
                    <th>Scheme Value</th>
                    <th>Sampled</th>
                    <th>Damaged</th>
                    <th>Expected Closing</th>
                    <th>Actual Closing</th>
                    <th>Mismatch</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((row) => (
                    <tr key={row.sku.id}>
                      <td>
                        {row.sku.name}
                        {row.sku.variantLabel ? ` (${row.sku.variantLabel})` : ''}
                      </td>
                      <td>{fmt(row.openingStock)}</td>
                      <td>{fmt(row.received)}</td>
                      <td>{fmt(row.soldQuantity)}</td>
                      <td>₹{fmt(row.soldAmount)}</td>
                      <td>{fmt(row.freeSchemeQuantity)}</td>
                      <td>₹{fmt(row.freeSchemeValue)}</td>
                      <td>{fmt(row.sampled)}</td>
                      <td>{fmt(row.damaged)}</td>
                      <td>{fmt(row.expectedClosing)}</td>
                      <td>{row.actualClosing === null ? '—' : fmt(row.actualClosing)}</td>
                      <td>
                        {row.mismatch === null ? (
                          '—'
                        ) : row.mismatch === 0 ? (
                          <span className="badge status-active">Matched</span>
                        ) : (
                          <span className="badge status-inactive">{row.mismatch > 0 ? '+' : ''}{fmt(row.mismatch)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'WEEKLY' && weekly && !loading && (
        <>
          <p className="subtitle">
            Trends, target vs achievement, state comparison, team performance, data quality, and
            recurring exceptions for the selected date range (spec §32).
          </p>

          <div className="panel">
            <h3>Trends</h3>
            {weekly.trends.length === 0 ? (
              <p className="subtitle">No activity captured in this period yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Outlets Visited</th>
                      <th>Units Sold</th>
                      <th>Sales Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekly.trends.map((t) => (
                      <tr key={t.date}>
                        <td>{t.date}</td>
                        <td>{fmt(t.outletsVisited)}</td>
                        <td>{fmt(t.unitsSold)}</td>
                        <td>₹{fmt(t.salesAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <h3>Target vs Achievement</h3>
            {weekly.kpiAchievement.length === 0 ? (
              <p className="subtitle">
                No targets configured for this period — set them under the Targets page.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>KPI</th>
                      <th>Target</th>
                      <th>Actual</th>
                      <th>Achievement %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekly.kpiAchievement.map((k) => (
                      <tr key={k.kpiKey}>
                        <td>{k.label}</td>
                        <td>{fmt(k.targetValue)}</td>
                        <td>{fmt(k.actualValue)}</td>
                        <td>{k.achievementPercent === null ? '—' : `${k.achievementPercent}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <h3>State Comparison</h3>
            {weekly.stateComparison.length === 0 ? (
              <p className="subtitle">No stops planned in this period yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>State</th>
                      <th>Planned Stops</th>
                      <th>Completed Stops</th>
                      <th>Completion %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekly.stateComparison.map((s) => (
                      <tr key={s.state}>
                        <td>{s.state}</td>
                        <td>{s.plannedStops}</td>
                        <td>{s.completedStops}</td>
                        <td>{s.completionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <h3>Team Performance</h3>
            {weekly.teamPerformance.length === 0 ? (
              <p className="subtitle">No assignments in this period yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Assigned</th>
                      <th>In Progress</th>
                      <th>Completed</th>
                      <th>Cancelled</th>
                      <th>Completion %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekly.teamPerformance.map((p) => (
                      <tr key={p.userId}>
                        <td>{p.fullName}</td>
                        <td>{p.assigned}</td>
                        <td>{p.inProgress}</td>
                        <td>{p.completed}</td>
                        <td>{p.cancelled}</td>
                        <td>{p.completionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <h3>Data Quality</h3>
            <StatRow label="Completed stops" value={weekly.dataQuality.completedStops} />
            <StatRow label="Stops with no photo evidence" value={weekly.dataQuality.stopsWithNoPhotoEvidence} />
            <StatRow label="Stops with form submitted 24h+ late" value={weekly.dataQuality.stopsWithFormSubmittedOver24hLate} />
          </div>

          <div className="panel">
            <h3>Recurring Exceptions</h3>
            {weekly.recurringExceptions.length === 0 ? (
              <p className="subtitle">No category has recurred more than once in this period.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {weekly.recurringExceptions.map((e) => (
                    <tr key={e.category}>
                      <td>{e.category}</td>
                      <td>{e.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="panel">
            <h3>Corrective Actions</h3>
            {weekly.correctiveActions.length === 0 ? (
              <p className="subtitle">No resolved exceptions with a written resolution in this period.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Severity</th>
                      <th>Resolution</th>
                      <th>Resolved At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekly.correctiveActions.map((c, i) => (
                      <tr key={i}>
                        <td>{c.category}</td>
                        <td>{c.severity}</td>
                        <td>{c.resolution}</td>
                        <td>{c.resolvedAt ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'CLOSURE' && closure && !loading && (
        <>
          <p className="subtitle">
            Spans the campaign’s full lifetime (spec §32) — no date range applies to this report.
          </p>

          <div className="panel">
            <h3>Overview</h3>
            {closure.overview ? (
              <>
                <StatRow label="Campaign" value={closure.overview.campaignName} />
                <StatRow label="Client" value={closure.overview.clientName} />
                <StatRow label="Status" value={closure.overview.status} />
                <StatRow label="Start date" value={new Date(closure.overview.startDate).toLocaleDateString('en-IN')} />
                <StatRow
                  label="End date"
                  value={closure.overview.endDate ? new Date(closure.overview.endDate).toLocaleDateString('en-IN') : '—'}
                />
              </>
            ) : (
              <p className="subtitle">Campaign not found.</p>
            )}
          </div>

          <div className="panel">
            <h3>Geography Covered</h3>
            <StatRow label="States" value={closure.geography.states} />
            <StatRow label="Districts" value={closure.geography.districts} />
            <StatRow label="Tehsils" value={closure.geography.tehsils} />
            <StatRow label="Locations" value={closure.geography.locations} />
          </div>

          <div className="panel">
            <h3>Planned vs Executed</h3>
            <StatRow label="Planned stops" value={closure.plannedVsExecuted.plannedStops} />
            <StatRow label="Completed stops" value={closure.plannedVsExecuted.completedStops} />
            <StatRow label="Cancelled stops" value={closure.plannedVsExecuted.cancelledStops} />
            <StatRow label="Completion rate" value={`${closure.plannedVsExecuted.completionRate}%`} />
          </div>

          <div className="panel">
            <h3>KPI Achievement</h3>
            {closure.kpiAchievement.length === 0 ? (
              <p className="subtitle">No targets configured — set them under the Targets page.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>KPI</th>
                    <th>Target</th>
                    <th>Actual</th>
                    <th>Achievement %</th>
                  </tr>
                </thead>
                <tbody>
                  {closure.kpiAchievement.map((k) => (
                    <tr key={k.kpiKey}>
                      <td>{k.label}</td>
                      <td>{fmt(k.targetValue)}</td>
                      <td>{fmt(k.actualValue)}</td>
                      <td>{k.achievementPercent === null ? '—' : `${k.achievementPercent}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="panel">
            <h3>Sales &amp; Trials</h3>
            <StatRow label="Total units sold" value={fmt(closure.sales.totalUnitsSold)} />
            <StatRow label="Total sales amount" value={`₹${fmt(closure.sales.totalSalesAmount)}`} />
            <StatRow label="Total units sampled (trials)" value={fmt(closure.trials.totalUnitsSampled)} />
          </div>

          <div className="panel">
            <h3>Leads</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {closure.leads.byStatus.map((l) => (
                  <tr key={l.status}>
                    <td>{l.status}</td>
                    <td>{l.count}</td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <strong>Total</strong>
                  </td>
                  <td>
                    <strong>{closure.leads.total}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h3>Activity Completion</h3>
            <p className="subtitle">
              No single &quot;installations&quot; concept exists across every campaign type — shown here as
              completion by activity type instead.
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Activity Type</th>
                  <th>Planned</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {closure.activityCompletion.map((a) => (
                  <tr key={a.activityTypeName}>
                    <td>{a.activityTypeName}</td>
                    <td>{a.planned}</td>
                    <td>{a.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h3>Evidence</h3>
            <StatRow label="Total media" value={closure.evidence.totalMediaCount} />
            <StatRow label="Photos" value={closure.evidence.photoCount} />
            <StatRow label="Videos" value={closure.evidence.videoCount} />
            <StatRow label="Signatures" value={closure.evidence.signatureCount} />
          </div>

          <div className="panel">
            <h3>Route Compliance</h3>
            <StatRow label="Total deviation requests" value={closure.routeCompliance.totalDeviationRequests} />
            <StatRow label="Approved" value={closure.routeCompliance.approved} />
            <StatRow label="Rejected" value={closure.routeCompliance.rejected} />
            <StatRow label="Pending" value={closure.routeCompliance.pending} />
            <StatRow
              label="Average distance from planned point"
              value={closure.routeCompliance.averageDistanceMeters === null ? '—' : `${closure.routeCompliance.averageDistanceMeters} m`}
            />
          </div>

          <div className="panel">
            <h3>Operational Issues</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {closure.operationalIssues.byCategory.map((i) => (
                  <tr key={i.category}>
                    <td>{i.category}</td>
                    <td>{i.count}</td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <strong>Total</strong>
                  </td>
                  <td>
                    <strong>{closure.operationalIssues.totalExceptions}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h3>Learnings &amp; Recommendations</h3>
            <p className="subtitle">
              This is left blank on purpose — no system can honestly generate learnings or
              recommendations on your team&apos;s behalf. The downloaded Excel file has a blank sheet
              ready for your team to fill in by hand.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
