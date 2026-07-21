'use client';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { DashboardSummary, DrillDownResponse } from '@impact/shared';
import { useCallback, useEffect, useState } from 'react';

// Spec §26 (dashboard KPIs) + §27 (drill-down), narrowed to a single campaign at a time — see
// docs/ASSUMPTIONS.md A-070 for why the cross-campaign "national" view isn't built this session.
interface Crumb {
  state?: string;
  district?: string;
  tehsil?: string;
  locationName?: string;
  label: string;
}

const fmtDateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN') : '—');

export default function OverviewPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [drillDown, setDrillDown] = useState<DrillDownResponse>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);

  const currentParams = useCallback(() => {
    const last = crumbs[crumbs.length - 1];
    return {
      state: last?.state,
      district: last?.district,
      tehsil: last?.tehsil,
      locationName: last?.locationName,
    };
  }, [crumbs]);

  const load = useCallback(() => {
    if (!selectedCampaignId) return;
    setError(null);
    setLoading(true);
    Promise.all([api.dashboard.summary(selectedCampaignId), api.dashboard.drillDown(selectedCampaignId, currentParams())])
      .then(([s, d]) => {
        setSummary(s);
        setDrillDown(d);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the dashboard'))
      .finally(() => setLoading(false));
  }, [selectedCampaignId, currentParams]);

  useEffect(() => {
    load();
  }, [load]);

  const drillInto = (label: string, extra: Partial<Crumb>) => {
    const last = crumbs[crumbs.length - 1];
    setCrumbs([...crumbs, { ...last, label, ...extra }]);
  };

  const jumpTo = (index: number) => {
    setCrumbs(crumbs.slice(0, index + 1));
  };

  const jumpToRoot = () => {
    setCrumbs([]);
  };

  if (!selectedCampaignId) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h1>No campaign selected</h1>
        <p className="subtitle">Select a campaign from the top bar to view the dashboard.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <h1>Overview {activeCampaign ? `— ${activeCampaign.campaignName}` : ''}</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {summary && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <p className="subtitle">Today's numbers for this campaign.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <Kpi label="Planned today" value={summary.activities.planned} />
            <Kpi label="Started" value={summary.activities.started} />
            <Kpi label="Completed" value={summary.activities.completed} />
            <Kpi label="Delayed" value={summary.activities.delayed} />
            <Kpi label="Missed" value={summary.activities.missed} />
            <Kpi label="Day started" value={`${summary.attendance.dayStarted} / ${summary.attendance.totalMembers}`} />
            <Kpi label="Pending approvals" value={summary.pendingApprovals} />
            <Kpi label="Pending deviations" value={summary.pendingDeviations} />
            <Kpi label="Open exceptions" value={summary.openExceptions} />
            <Kpi label="Offline / unsynced users" value={summary.offlineOrUnsyncedUsers} />
          </div>
        </div>
      )}

      <div className="panel">
        <p className="subtitle">
          Drill down: Campaign
          {crumbs.map((c, i) => (
            <span key={i}>
              {' → '}
              <button style={{ padding: 0, background: 'none', border: 'none', color: 'var(--brand-primary)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }} onClick={() => jumpTo(i)}>
                {c.label}
              </button>
            </span>
          ))}
        </p>
        {crumbs.length > 0 && (
          <button className="btn-secondary" style={{ marginBottom: 12 }} onClick={jumpToRoot}>
            ← Back to states
          </button>
        )}

        {loading && <p className="subtitle">Loading…</p>}

        {!loading && drillDown?.level === 'CAMPAIGN' && (
          <NameCountTable rows={drillDown.states} header="State" onClick={(name) => drillInto(name, { state: name })} />
        )}
        {!loading && drillDown?.level === 'STATE' && (
          <NameCountTable
            rows={drillDown.districts}
            header="District"
            onClick={(name) => drillInto(name, { district: name })}
          />
        )}
        {!loading && drillDown?.level === 'DISTRICT' && (
          <NameCountTable rows={drillDown.tehsils} header="Tehsil" onClick={(name) => drillInto(name, { tehsil: name })} />
        )}
        {!loading && drillDown?.level === 'TEHSIL' && (
          <NameCountTable
            rows={drillDown.locations}
            header="Location"
            onClick={(name) => drillInto(name, { locationName: name })}
          />
        )}
        {!loading && drillDown?.level === 'LOCATION' && (
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Planned date</th>
                <th>Started</th>
                <th>Ended</th>
              </tr>
            </thead>
            <tbody>
              {drillDown.activities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="subtitle">
                    No activity here yet.
                  </td>
                </tr>
              ) : (
                drillDown.activities.map((a) => (
                  <tr key={a.id}>
                    <td>{a.userFullName ?? '—'}</td>
                    <td>{a.status}</td>
                    <td>{new Date(a.plannedDate).toLocaleDateString('en-IN')}</td>
                    <td>{fmtDateTime(a.actualStartAt)}</td>
                    <td>{fmtDateTime(a.actualEndAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ fontSize: 24, fontWeight: 600 }}>{value}</div>
      <div className="subtitle" style={{ margin: 0 }}>
        {label}
      </div>
    </div>
  );
}

function NameCountTable({ rows, header, onClick }: { rows: { name: string; count: number }[]; header: string; onClick: (name: string) => void }) {
  if (rows.length === 0) return <p className="subtitle">Nothing here yet.</p>;
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>{header}</th>
          <th>Stops</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name}>
            <td>
              <button style={{ padding: 0, background: 'none', border: 'none', color: 'var(--brand-primary)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }} onClick={() => onClick(r.name)}>
                {r.name}
              </button>
            </td>
            <td>{r.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
