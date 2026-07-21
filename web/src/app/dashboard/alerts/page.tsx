'use client';

import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { AlertRecord, AlertStatus } from '@impact/shared';
import { useEffect, useState } from 'react';

// Spec §29's general in-app alert inbox. The Device Risk page already reads a filtered slice of
// the same underlying data for its own two signal types (clock mismatch, mock location) — this
// shows every alert regardless of type, so nothing raised elsewhere in the system goes unseen.
const TABS: AlertStatus[] = ['OPEN', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED'];

export default function AlertsPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [tab, setTab] = useState<AlertStatus>('OPEN');
  const [alerts, setAlerts] = useState<AlertRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);

  const load = () => {
    if (!selectedCampaignId) return;
    setError(null);
    api.alerts
      .list(selectedCampaignId, tab)
      .then(setAlerts)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load alerts'));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaignId, tab]);

  const runAction = async (alertId: string, action: () => Promise<AlertRecord>, fallbackMessage: string) => {
    setBusyId(alertId);
    setError(null);
    try {
      await action();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : fallbackMessage);
    } finally {
      setBusyId(null);
    }
  };

  if (!selectedCampaignId) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h1>No campaign selected</h1>
        <p className="subtitle">Select a campaign from the top bar to review alerts.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <h1>Alerts {activeCampaign ? `— ${activeCampaign.campaignName}` : ''}</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'btn-primary inline' : 'btn-secondary'} onClick={() => setTab(t)}>
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="panel">
        {alerts === null ? (
          <p className="subtitle">Loading…</p>
        ) : alerts.length === 0 ? (
          <p className="subtitle">Nothing here right now.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Issue</th>
                <th>User</th>
                <th>Owner</th>
                <th>Raised</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.issueType}
                    {a.escalationLevel > 0 && ` (escalated ×${a.escalationLevel})`}
                  </td>
                  <td>{a.userFullName ?? '—'}</td>
                  <td>{a.ownerFullName ?? 'Unassigned'}</td>
                  <td>{new Date(a.timestamp).toLocaleString()}</td>
                  <td>
                    <div className="panel-actions" style={{ margin: 0 }}>
                      {a.status === 'OPEN' && (
                        <button
                          className="btn-secondary"
                          disabled={busyId === a.id}
                          onClick={() => runAction(a.id, () => api.alerts.acknowledge(selectedCampaignId, a.id), 'Could not acknowledge this alert')}
                        >
                          Acknowledge
                        </button>
                      )}
                      {a.status !== 'RESOLVED' && (
                        <>
                          <button
                            className="btn-secondary"
                            disabled={busyId === a.id}
                            onClick={() => runAction(a.id, () => api.alerts.resolve(selectedCampaignId, a.id, {}), 'Could not resolve this alert')}
                          >
                            Resolve
                          </button>
                          <button
                            className="btn-secondary"
                            disabled={busyId === a.id}
                            onClick={() => runAction(a.id, () => api.alerts.escalate(selectedCampaignId, a.id), 'Could not escalate this alert')}
                          >
                            Escalate
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
