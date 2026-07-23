'use client';

import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { DASHBOARD_WIDGET_KEYS, DASHBOARD_WIDGET_LABELS } from '@impact/shared';
import type { ClientDashboardResponse, DashboardWidgetConfigRow, MyAccessResponse } from '@impact/shared';
import { useEffect, useState } from 'react';

// Spec §26's fourth persona ("Client dashboard, enabled only by Impact") — the widgets shown here
// are picked by an Impact admin from a validated catalog, per campaign. Nothing here is computed
// specially for this page: every widget re-presents data the Overview/Reports pages already show.

const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function ClientDashboardPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [access, setAccess] = useState<MyAccessResponse | null>(null);
  const [dashboard, setDashboard] = useState<ClientDashboardResponse | null>(null);
  const [config, setConfigState] = useState<DashboardWidgetConfigRow[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = access?.permissions.includes('manage_forms') ?? false;
  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);

  const loadDashboard = () => {
    if (!selectedCampaignId) return;
    setError(null);
    api.clientDashboard
      .render(selectedCampaignId)
      .then(setDashboard)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load dashboard'));
  };

  useEffect(() => {
    loadDashboard();
    setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaignId]);

  useEffect(() => {
    if (!selectedCampaignId) return;
    let cancelled = false;
    api
      .myAccess(selectedCampaignId)
      .then((res) => {
        if (!cancelled) setAccess(res);
      })
      .catch(() => {
        if (!cancelled) setAccess(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCampaignId]);

  const startEditing = async () => {
    if (!selectedCampaignId) return;
    setError(null);
    try {
      const rows = await api.clientDashboard.getConfig(selectedCampaignId);
      setConfigState(rows);
      setSelectedKeys(rows.map((r) => r.widgetKey));
      setEditing(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load widget configuration');
    }
  };

  const toggleKey = (key: string) => {
    setSelectedKeys((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]));
  };

  const move = (key: string, direction: -1 | 1) => {
    setSelectedKeys((keys) => {
      const i = keys.indexOf(key);
      const j = i + direction;
      if (i === -1 || j < 0 || j >= keys.length) return keys;
      const copy = [...keys];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  };

  const save = async () => {
    if (!selectedCampaignId) return;
    setSaving(true);
    setError(null);
    try {
      await api.clientDashboard.setConfig(selectedCampaignId, { widgetKeys: selectedKeys });
      setEditing(false);
      loadDashboard();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save widget configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h1>Client Dashboard {activeCampaign ? `— ${activeCampaign.campaignName}` : ''}</h1>
        {canManage && !editing && (
          <button className="btn-primary inline" onClick={startEditing}>
            Configure Widgets
          </button>
        )}
      </div>

      <p className="subtitle">
        The widgets below are picked by your Impact admin for this campaign — every number reuses
        the exact same data already shown on Overview and Reports, nothing is calculated specially
        for this page.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {editing && config && (
        <div className="panel">
          <h2>Configure Widgets</h2>
          <p className="subtitle">Check which widgets should appear, and use the arrows to set their order.</p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Show</th>
                <th>Widget</th>
                <th>Order</th>
              </tr>
            </thead>
            <tbody>
              {DASHBOARD_WIDGET_KEYS.map((key) => {
                const checked = selectedKeys.includes(key);
                const idx = selectedKeys.indexOf(key);
                return (
                  <tr key={key}>
                    <td>
                      <input type="checkbox" checked={checked} onChange={() => toggleKey(key)} />
                    </td>
                    <td>{DASHBOARD_WIDGET_LABELS[key]}</td>
                    <td>
                      {checked && (
                        <>
                          <button className="btn-secondary inline" disabled={idx === 0} onClick={() => move(key, -1)}>
                            ↑
                          </button>{' '}
                          <button className="btn-secondary inline" disabled={idx === selectedKeys.length - 1} onClick={() => move(key, 1)}>
                            ↓
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="panel-actions">
            <button className="btn-primary inline" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save widget selection'}
            </button>
            <button className="btn-secondary inline" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!dashboard ? (
        <p className="subtitle">Loading…</p>
      ) : dashboard.widgets.length === 0 ? (
        <p className="subtitle">
          No widgets configured for this campaign yet.
          {canManage ? ' Click "Configure Widgets" above to pick some.' : ' Ask your Impact contact to set this up.'}
        </p>
      ) : (
        dashboard.widgets.map((widget) => (
          <div className="panel" key={widget.key}>
            <h3>{widget.label}</h3>
            {widget.type === 'stats' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                {widget.stats.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
                    <span className="subtitle">{s.label}</span>
                    <strong>{typeof s.value === 'number' ? fmt(s.value) : s.value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {widget.table.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {widget.table.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{typeof cell === 'number' ? fmt(cell) : cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
