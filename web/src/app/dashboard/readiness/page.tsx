'use client';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ReadinessRow } from '@impact/shared';
import { useCallback, useEffect, useState } from 'react';

// Spec §12: Activity Spoke / Operations Director view of pre-activity SOP readiness — a read-only
// rollup, computed server-side from checklist responses, never edited here.
const STATUS_LABEL: Record<ReadinessRow['status'], string> = {
  COMPLETED: 'Completed',
  PENDING: 'Pending',
  AT_RISK: 'At risk',
  DELAYED: 'Delayed',
  NOT_APPLICABLE: 'Not applicable',
};

const STATUS_CLASS: Record<ReadinessRow['status'], string> = {
  COMPLETED: 'status-active',
  PENDING: 'status-inactive',
  AT_RISK: 'status-inactive',
  DELAYED: 'status-inactive',
  NOT_APPLICABLE: 'status-inactive',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReadinessPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [date, setDate] = useState(todayIso());
  const [rows, setRows] = useState<ReadinessRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);

  const load = useCallback(() => {
    if (!selectedCampaignId) return;
    setError(null);
    api
      .workflow.readiness(selectedCampaignId, date)
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load readiness'));
  }, [selectedCampaignId, date]);

  useEffect(() => {
    load();
  }, [load]);

  if (!selectedCampaignId) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h1>No campaign selected</h1>
        <p className="subtitle">Select a campaign from the top bar to view readiness.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <h1>Readiness — {activeCampaign?.campaignName ?? ''}</h1>
      </div>

      <div className="panel">
        <div className="field" style={{ maxWidth: 220 }}>
          <label>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {rows === null ? (
        <p className="subtitle">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="subtitle">No activities planned for this date.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Field worker</th>
              <th>Location</th>
              <th>Stage</th>
              <th>Checklist</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.activityInstanceId}>
                <td>{row.assignedUserName}</td>
                <td>{row.locationName}</td>
                <td>{row.stageName ?? '—'}</td>
                <td>
                  {row.totalCount === 0
                    ? '—'
                    : `${row.resolvedCount}/${row.totalCount} (${row.percentComplete}%)`}
                </td>
                <td>
                  <span className={`badge ${STATUS_CLASS[row.status]}`}>{STATUS_LABEL[row.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
