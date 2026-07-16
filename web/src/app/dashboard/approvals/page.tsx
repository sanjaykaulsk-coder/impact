'use client';

import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ApprovalDecisionStatus, SupervisorInboxItem } from '@impact/shared';
import { useEffect, useState } from 'react';

const TABS: ApprovalDecisionStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

export default function ApprovalsPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [tab, setTab] = useState<ApprovalDecisionStatus>('PENDING');
  const [items, setItems] = useState<SupervisorInboxItem[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [remarks, setRemarks] = useState('');
  const [deciding, setDeciding] = useState(false);

  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);
  const selected = items?.find((i) => i.approvalId === selectedId) ?? null;

  const load = () => {
    if (!selectedCampaignId) return;
    setError(null);
    setItems(null);
    api.supervisor
      .inbox(selectedCampaignId, tab)
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the review queue'));
  };

  useEffect(() => {
    load();
    setSelectedId(null);
    setRemarks('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaignId, tab]);

  const decide = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedCampaignId || !selected) return;
    if (decision === 'REJECTED' && !remarks.trim()) {
      setError('Remarks are required when rejecting, so the field worker knows what to correct.');
      return;
    }
    setDeciding(true);
    setError(null);
    try {
      await api.supervisor.decide(selectedCampaignId, selected.approvalId, {
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

  if (!selectedCampaignId) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h1>No campaign selected</h1>
        <p className="subtitle">Select a campaign from the top bar to review submissions.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <h1>Approvals — {activeCampaign?.campaignName ?? ''}</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t}
            className={t === tab ? 'btn-primary inline' : 'btn-secondary'}
            onClick={() => setTab(t)}
          >
            {t === 'PENDING' ? 'Pending review' : t === 'APPROVED' ? 'Approved' : 'Rejected'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '360px 1fr' : '1fr', gap: 16, alignItems: 'start' }}>
        <div className="panel">
          {items === null ? (
            <p className="subtitle">Loading…</p>
          ) : items.length === 0 ? (
            <p className="subtitle">
              {tab === 'PENDING' ? 'Nothing waiting for review right now.' : `No ${tab.toLowerCase()} submissions yet.`}
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Field user</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.approvalId}
                    className="clickable"
                    onClick={() => {
                      setSelectedId(item.approvalId);
                      setRemarks('');
                      setError(null);
                    }}
                    style={item.approvalId === selectedId ? { background: 'var(--surface-hover, #f0f4f2)' } : undefined}
                  >
                    <td>{item.activity.locationName}</td>
                    <td>{item.activity.assignedUserName}</td>
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
              {selected.activity.locationName} — {selected.activity.assignedUserName}
            </h2>

            {selected.status !== 'PENDING' && (
              <p className="subtitle">
                Decided by {selected.decidedByName ?? 'unknown'} on{' '}
                {selected.decidedAt ? new Date(selected.decidedAt).toLocaleString() : '—'}
                {selected.remarks ? ` — "${selected.remarks}"` : ''}
              </p>
            )}

            <h3 style={{ marginTop: 20 }}>GPS</h3>
            <div className="form-grid">
              <div className="field">
                <label>Check-in</label>
                {selected.checkIn ? (
                  <p>
                    {Number(selected.checkIn.latitude).toFixed(6)}, {Number(selected.checkIn.longitude).toFixed(6)}
                    <br />
                    {new Date(selected.checkIn.deviceTimestamp).toLocaleString()}
                    {selected.checkIn.distanceFromPlannedMeters != null &&
                      ` — ${Math.round(Number(selected.checkIn.distanceFromPlannedMeters))}m from planned location`}
                  </p>
                ) : (
                  <p className="subtitle">Not recorded</p>
                )}
              </div>
              <div className="field">
                <label>Check-out</label>
                {selected.checkOut ? (
                  <p>
                    {Number(selected.checkOut.latitude).toFixed(6)}, {Number(selected.checkOut.longitude).toFixed(6)}
                    <br />
                    {new Date(selected.checkOut.deviceTimestamp).toLocaleString()}
                  </p>
                ) : (
                  <p className="subtitle">Not recorded</p>
                )}
              </div>
            </div>

            <h3 style={{ marginTop: 20 }}>Photo evidence</h3>
            {selected.media.length === 0 ? (
              <p className="subtitle">No photos on this activity.</p>
            ) : (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {selected.media.map((m) => (
                  <a key={m.id} href={m.url} target="_blank" rel="noreferrer">
                    <img
                      src={m.url}
                      alt="Opening evidence — watermarked with location, time, GPS and field user"
                      style={{ width: 260, borderRadius: 8, border: '1px solid var(--border)', display: 'block' }}
                    />
                  </a>
                ))}
              </div>
            )}

            <h3 style={{ marginTop: 20 }}>Form answers</h3>
            {selected.formResponses.length === 0 ? (
              <p className="subtitle">No form submitted on this activity.</p>
            ) : (
              <table className="data-table">
                <tbody>
                  {selected.formResponses.map((fr, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{fr.questionLabel}</td>
                      <td>{typeof fr.valueJson === 'boolean' ? (fr.valueJson ? 'Yes' : 'No') : String(fr.valueJson ?? '—')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selected.status === 'PENDING' && (
              <div style={{ marginTop: 20 }}>
                <div className="field">
                  <label>Remarks (required to reject)</label>
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
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
