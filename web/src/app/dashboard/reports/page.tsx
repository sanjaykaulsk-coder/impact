'use client';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { DfrReportResponse, StockReconciliationRow } from '@impact/shared';
import React, { useCallback, useEffect, useState } from 'react';

// Both reports are rollup queries over record-level captures (report-format-library §2): the DFR
// is never entered as a form — every number is SUM(sku_movements) for that day/location, and the
// stock view applies spec §22's reconciliation formula. Nothing on this page is editable.

type Tab = 'DFR' | 'STOCK';

const fmt = (n: number) =>
  n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function ReportsPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [tab, setTab] = useState<Tab>('DFR');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [dfr, setDfr] = useState<DfrReportResponse | null>(null);
  const [stock, setStock] = useState<StockReconciliationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);

  const load = useCallback(() => {
    if (!selectedCampaignId) return;
    setError(null);
    setLoading(true);
    const request =
      tab === 'DFR'
        ? api.reports.dfr(selectedCampaignId, from || undefined, to || undefined).then(setDfr)
        : api.reports.stockReconciliation(selectedCampaignId, from || undefined, to || undefined).then(setStock);
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
        <button
          className={tab === 'DFR' ? 'btn-primary inline' : 'btn-secondary'}
          onClick={() => setTab('DFR')}
        >
          Daily Field Report (DFR)
        </button>
        <button
          className={tab === 'STOCK' ? 'btn-primary inline' : 'btn-secondary'}
          onClick={() => setTab('STOCK')}
        >
          Stock Reconciliation
        </button>
      </div>

      <div className="panel">
        <div className="form-grid">
          <div className="field">
            <label>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field">
            <label>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
    </div>
  );
}
