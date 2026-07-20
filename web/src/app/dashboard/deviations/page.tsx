'use client';

import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ApprovalDecisionStatus, DeviationRequestSummary } from '@impact/shared';
import { useEffect, useState } from 'react';

const TABS: ApprovalDecisionStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

const DEVIATION_LABELS: Record<string, string> = {
  OUTSIDE_PERMITTED_RADIUS: 'Outside permitted radius',
  UNPLANNED_LOCATION: 'Unplanned location',
  SKIPPED_LOCATION: 'Skipped location',
  WRONG_SEQUENCE: 'Wrong sequence',
  LATE_ARRIVAL: 'Late arrival',
  EARLY_DEPARTURE: 'Early departure',
  UNPLANNED_STOPPAGE: 'Unplanned stoppage',
  GPS_DISABLED: 'GPS disabled/unavailable',
  ABNORMAL_SPEED: 'Abnormal speed',
  SUSPECTED_LOCATION_MANIPULATION: 'Suspected location manipulation',
};

// Spec §14: a deviation request never blocks the field worker's activity — approving or rejecting
// only records whether the explanation was accepted, same posture as Approvals but for route/GPS
// deviations specifically rather than a full activity submission.
export default function DeviationsPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [tab, setTab] = useState<ApprovalDecisionStatus>('PENDING');
  const [items, setItems] = useState<DeviationRequestSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [remarks, setRemarks] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [escalating, setEscalating] = useState(false);

  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);
  const selected = items?.find((i) => i.id === selectedId) ?? null;

  const load = () => {
    if (!selectedCampaignId) return;
    setError(null);
    setItems(null);
    api.supervisor
      .deviationInbox(selectedCampaignId, tab)
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load deviation requests'));
  };

  useEffect(() => {
    load();
    setSelectedId(null);
    setRemarks('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaignId, tab]);

  const decide = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedCampaignId || !selected) return;
    setDeciding(true);
    setError(null);
    try {
      await api.supervisor.decideDeviation(selectedCampaignId, selected.id, {
        decision,
        remarks: remarks.trim() || undefined,
      });
      setSelectedId(null);
      setRemarks('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the decision');
    } finally {
      setDeciding(false);
    }
  };

  const escalate = async () => {
    if (!selectedCampaignId || !selected) return;
    setEscalating(true);
    setError(null);
    try {
      await api.supervisor.escalateDeviation(selectedCampaignId, selected.id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not escalate this request');
    } finally {
      setEscalating(false);
    }
  };

  if (!selectedCampaignId) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h1>No campaign selected</h1>
        <p className="subtitle">Select a campaign from the top bar to review deviations.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <h1>Deviations — {activeCampaign?.campaignName ?? ''}</h1>
      </div>

      <p className="subtitle">
        When a field visit goes off-plan — wrong location, late arrival, unusual stoppage — the
        activity keeps running, but the field worker explains why and it lands here for review.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'btn-primary inline' : 'btn-secondary'} onClick={() => setTab(t)}>
            {t === 'PENDING' ? 'Pending review' : t === 'APPROVED' ? 'Approved' : 'Rejected'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '380px 1fr' : '1fr', gap: 16, alignItems: 'start' }}>
        <div className="panel">
          {items === null ? (
            <p className="subtitle">Loading…</p>
          ) : items.length === 0 ? (
            <p className="subtitle">
              {tab === 'PENDING' ? 'No deviations waiting for review right now.' : `No ${tab.toLowerCase()} deviations yet.`}
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Field user</th>
                  <th>Type</th>
                  <th>Reported</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="clickable"
                    onClick={() => {
                      setSelectedId(item.id);
                      setRemarks('');
                      setError(null);
                    }}
                    style={item.id === selectedId ? { background: 'var(--surface-hover, #f0f4f2)' } : undefined}
                  >
                    <td>{item.locationName}</td>
                    <td>{item.userFullName}</td>
                    <td>
                      {DEVIATION_LABELS[item.deviationType] ?? item.deviationType}
                      {item.escalationLevel > 0 && (
                        <span className="badge status-inactive" style={{ marginLeft: 6 }}>
                          escalated ×{item.escalationLevel}
                        </span>
                      )}
                    </td>
                    <td>{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className="panel">
            <h2>
              {selected.locationName} — {selected.userFullName}
            </h2>
            <p className="subtitle">{DEVIATION_LABELS[selected.deviationType] ?? selected.deviationType}</p>

            {selected.status !== 'PENDING' && (
              <p className="subtitle">
                Decided by {selected.decidedByName ?? 'unknown'} on{' '}
                {selected.decidedAt ? new Date(selected.decidedAt).toLocaleString() : '—'}
              </p>
            )}

            <h3 style={{ marginTop: 20 }}>Field worker's explanation</h3>
            <p>{selected.reason}</p>
            {selected.remarks && <p className="subtitle">{selected.remarks}</p>}
            {selected.distanceMeters != null && (
              <p className="subtitle">{Math.round(Number(selected.distanceMeters))}m from the planned location</p>
            )}

            {selected.status === 'PENDING' && (
              <div style={{ marginTop: 20 }}>
                <div className="field">
                  <label>Remarks (optional)</label>
                  <textarea
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
                  />
                </div>
                <div className="panel-actions">
                  <button className="btn-primary inline" disabled={deciding} onClick={() => decide('APPROVED')}>
                    {deciding ? 'Saving…' : 'Approve'}
                  </button>
                  <button className="btn-secondary" disabled={deciding} onClick={() => decide('REJECTED')}>
                    {deciding ? 'Saving…' : 'Reject'}
                  </button>
                  <button className="btn-secondary" disabled={escalating} onClick={escalate}>
                    {escalating ? 'Escalating…' : 'Escalate'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
