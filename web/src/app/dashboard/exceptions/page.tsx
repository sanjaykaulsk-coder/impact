'use client';

import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { AvailableAssignmentUser, ExceptionRecord, ExceptionStatus } from '@impact/shared';
import { useEffect, useState } from 'react';

// Spec §30's full exception ticket lifecycle: Detected -> Assigned -> Acknowledged -> Under
// review -> Action taken -> Resolved -> Closure approved -> Reopened. Exceptions themselves are
// already being raised automatically (e.g. a stock count that doesn't reconcile, spec §22) — this
// page is the first place a supervisor can actually see and act on that queue.
const TABS: (ExceptionStatus | 'ALL')[] = ['ALL', 'DETECTED', 'ASSIGNED', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'ACTION_TAKEN', 'RESOLVED', 'CLOSURE_APPROVED', 'REOPENED'];

const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  ALL: 'All',
  DETECTED: 'Detected',
  ASSIGNED: 'Assigned',
  ACKNOWLEDGED: 'Acknowledged',
  UNDER_REVIEW: 'Under review',
  ACTION_TAKEN: 'Action taken',
  RESOLVED: 'Resolved',
  CLOSURE_APPROVED: 'Closed',
  REOPENED: 'Reopened',
};

export default function ExceptionsPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>('DETECTED');
  const [items, setItems] = useState<ExceptionRecord[] | null>(null);
  const [users, setUsers] = useState<AvailableAssignmentUser[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [assignUserId, setAssignUserId] = useState('');
  const [actionRemarks, setActionRemarks] = useState('');
  const [resolution, setResolution] = useState('');
  const [reopenRemarks, setReopenRemarks] = useState('');

  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);
  const selected = items?.find((i) => i.id === selectedId) ?? null;

  const load = () => {
    if (!selectedCampaignId) return;
    setError(null);
    api.exceptions
      .list(selectedCampaignId, tab === 'ALL' ? undefined : tab)
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load exceptions'));
    api.assignments.availableUsers(selectedCampaignId).then(setUsers).catch(() => setUsers([]));
  };

  useEffect(() => {
    load();
    setSelectedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaignId, tab]);

  const runAction = async (action: () => Promise<ExceptionRecord>, fallbackMessage: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      load();
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : fallbackMessage);
    } finally {
      setBusy(false);
    }
  };

  if (!selectedCampaignId) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h1>No campaign selected</h1>
        <p className="subtitle">Select a campaign from the top bar to review exceptions.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <h1>Exceptions {activeCampaign ? `— ${activeCampaign.campaignName}` : ''}</h1>
      </div>

      <p className="subtitle">
        These are raised automatically by the system — for example, a stock count that doesn&apos;t reconcile — and
        tracked here as a ticket from detection through to closure.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'btn-primary inline' : 'btn-secondary'} onClick={() => setTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '380px 1fr' : '1fr', gap: 16, alignItems: 'start' }}>
        <div className="panel">
          {items === null ? (
            <p className="subtitle">Loading…</p>
          ) : items.length === 0 ? (
            <p className="subtitle">Nothing here right now.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="clickable"
                    onClick={() => {
                      setSelectedId(item.id);
                      setAssignUserId('');
                      setActionRemarks('');
                      setResolution('');
                      setReopenRemarks('');
                      setError(null);
                    }}
                    style={item.id === selectedId ? { background: 'var(--surface-hover, #f0f4f2)' } : undefined}
                  >
                    <td>{item.category}</td>
                    <td>{item.locationName ?? '—'}</td>
                    <td>
                      <span className="badge status-inactive">{TAB_LABELS[item.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className="panel">
            <h2>{selected.category}</h2>
            <p className="subtitle">
              {selected.severity} severity · {selected.locationName ?? 'No location'} · {selected.userFullName ?? 'No field user'}
              {selected.escalationLevel > 0 && ` · escalated ×${selected.escalationLevel}`}
            </p>
            <p className="subtitle">{selected.remarks}</p>

            <div className="form-grid" style={{ marginTop: 12 }}>
              <div className="field">
                <label>Owner</label>
                <p>{selected.ownerFullName ?? 'Unassigned'}</p>
              </div>
              {selected.resolution && (
                <div className="field">
                  <label>Resolution</label>
                  <p>{selected.resolution}</p>
                </div>
              )}
            </div>

            <div style={{ marginTop: 20 }}>
              {selected.status === 'DETECTED' && (
                <>
                  <div className="field">
                    <label>Assign to</label>
                    <select
                      value={assignUserId}
                      onChange={(e) => setAssignUserId(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
                    >
                      <option value="" disabled>
                        Select a user…
                      </option>
                      {users.map((u) => (
                        <option key={u.userId} value={u.userId}>
                          {u.fullName} — {u.roleName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="panel-actions">
                    <button
                      className="btn-primary inline"
                      disabled={busy || !assignUserId}
                      onClick={() => runAction(() => api.exceptions.assign(selectedCampaignId, selected.id, { ownerUserId: assignUserId }), 'Could not assign this exception')}
                    >
                      Assign
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={busy}
                      onClick={() => runAction(() => api.exceptions.acknowledge(selectedCampaignId, selected.id), 'Could not acknowledge this exception')}
                    >
                      Acknowledge myself
                    </button>
                  </div>
                </>
              )}

              {selected.status === 'ASSIGNED' && (
                <button
                  className="btn-primary inline"
                  disabled={busy}
                  onClick={() => runAction(() => api.exceptions.acknowledge(selectedCampaignId, selected.id), 'Could not acknowledge this exception')}
                >
                  Acknowledge
                </button>
              )}

              {selected.status === 'ACKNOWLEDGED' && (
                <button
                  className="btn-primary inline"
                  disabled={busy}
                  onClick={() => runAction(() => api.exceptions.startReview(selectedCampaignId, selected.id), 'Could not start review')}
                >
                  Start review
                </button>
              )}

              {selected.status === 'UNDER_REVIEW' && (
                <>
                  <div className="field">
                    <label>What action was taken?</label>
                    <textarea
                      rows={3}
                      value={actionRemarks}
                      onChange={(e) => setActionRemarks(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
                    />
                  </div>
                  <button
                    className="btn-primary inline"
                    disabled={busy || !actionRemarks.trim()}
                    onClick={() =>
                      runAction(() => api.exceptions.actionTaken(selectedCampaignId, selected.id, { remarks: actionRemarks.trim() }), 'Could not record the action taken')
                    }
                  >
                    Record action taken
                  </button>
                </>
              )}

              {selected.status === 'ACTION_TAKEN' && (
                <>
                  <div className="field">
                    <label>Resolution</label>
                    <textarea
                      rows={3}
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
                    />
                  </div>
                  <button
                    className="btn-primary inline"
                    disabled={busy || !resolution.trim()}
                    onClick={() => runAction(() => api.exceptions.resolve(selectedCampaignId, selected.id, { resolution: resolution.trim() }), 'Could not resolve this exception')}
                  >
                    Mark resolved
                  </button>
                </>
              )}

              {selected.status === 'RESOLVED' && (
                <div className="panel-actions">
                  <button
                    className="btn-primary inline"
                    disabled={busy}
                    onClick={() => runAction(() => api.exceptions.approveClosure(selectedCampaignId, selected.id), 'Could not approve closure')}
                  >
                    Approve closure
                  </button>
                  <button className="btn-secondary" disabled={busy} onClick={() => setReopenRemarks(reopenRemarks || ' ')}>
                    Reopen instead
                  </button>
                </div>
              )}

              {(selected.status === 'RESOLVED' || selected.status === 'CLOSURE_APPROVED') && reopenRemarks && (
                <div style={{ marginTop: 12 }}>
                  <div className="field">
                    <label>Why does this need reopening?</label>
                    <textarea
                      rows={2}
                      value={reopenRemarks.trim()}
                      onChange={(e) => setReopenRemarks(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
                    />
                  </div>
                  <button
                    className="btn-secondary"
                    disabled={busy || !reopenRemarks.trim()}
                    onClick={() => runAction(() => api.exceptions.reopen(selectedCampaignId, selected.id, { remarks: reopenRemarks.trim() }), 'Could not reopen this exception')}
                  >
                    Reopen
                  </button>
                </div>
              )}

              {selected.status === 'CLOSURE_APPROVED' && !reopenRemarks && (
                <button className="btn-secondary" disabled={busy} onClick={() => setReopenRemarks(' ')}>
                  Reopen
                </button>
              )}

              {selected.status !== 'CLOSURE_APPROVED' && (
                <div style={{ marginTop: 12 }}>
                  <button
                    className="btn-secondary"
                    disabled={busy}
                    onClick={() => runAction(() => api.exceptions.escalate(selectedCampaignId, selected.id), 'Could not escalate this exception')}
                  >
                    Escalate
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
