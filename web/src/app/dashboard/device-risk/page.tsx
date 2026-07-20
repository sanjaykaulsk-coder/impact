'use client';

import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { DeviceRiskAlert } from '@impact/shared';
import { useEffect, useState } from 'react';

const SIGNAL_LABELS: Record<string, string> = {
  DEVICE_TIME_MISMATCH: "Device clock doesn't match server time",
  MOCK_LOCATION_SUSPECTED: 'Mock/manipulated location suspected',
};

// Spec §18: "personally owned phones; absolute prevention is impossible — implement risk
// detection, restriction and audit instead." A flagged device is restricted (can't start/complete
// a visit) until a supervisor clears it here, or blocks it outright.
export default function DeviceRiskPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [alerts, setAlerts] = useState<DeviceRiskAlert[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null);

  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);

  const load = () => {
    if (!selectedCampaignId) return;
    setError(null);
    api.supervisor
      .deviceRiskInbox(selectedCampaignId)
      .then(setAlerts)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load device risk alerts'));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaignId]);

  const clear = async (deviceId: string) => {
    if (!selectedCampaignId) return;
    setBusyDeviceId(deviceId);
    setError(null);
    try {
      await api.supervisor.clearDeviceRisk(selectedCampaignId, deviceId);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not clear this device');
    } finally {
      setBusyDeviceId(null);
    }
  };

  const block = async (deviceId: string) => {
    if (!selectedCampaignId) return;
    if (!window.confirm('Block this device? The user won\'t be able to log in from it until an admin unblocks it.')) return;
    setBusyDeviceId(deviceId);
    setError(null);
    try {
      await api.supervisor.blockDevice(selectedCampaignId, deviceId);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not block this device');
    } finally {
      setBusyDeviceId(null);
    }
  };

  if (!selectedCampaignId) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h1>No campaign selected</h1>
        <p className="subtitle">Select a campaign from the top bar to review device risk.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <h1>Device Risk — {activeCampaign?.campaignName ?? ''}</h1>
      </div>

      <p className="subtitle">
        Devices are automatically flagged when something looks off — a phone&apos;s clock far from
        the real time, or a location reading that looks manipulated. A flagged device can&apos;t
        start or complete a visit until you clear it here. This never stops or deletes anything the
        field worker already submitted.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <div className="panel">
        {alerts === null ? (
          <p className="subtitle">Loading…</p>
        ) : alerts.length === 0 ? (
          <p className="subtitle">No devices currently flagged.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Device</th>
                <th>Issue</th>
                <th>Current level</th>
                <th>Detected</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.alertId}>
                  <td>{a.userFullName}</td>
                  <td>
                    {a.deviceModel ?? 'Unknown device'}
                    {a.osVersion ? ` (${a.osVersion})` : ''}
                  </td>
                  <td>{SIGNAL_LABELS[a.issueType] ?? a.issueType}</td>
                  <td>
                    <span className="badge status-inactive">{a.riskLevel ?? '—'}</span>
                  </td>
                  <td>{new Date(a.createdAt).toLocaleString()}</td>
                  <td>
                    {a.deviceId && (
                      <div className="panel-actions" style={{ margin: 0 }}>
                        <button className="btn-secondary" disabled={busyDeviceId === a.deviceId} onClick={() => clear(a.deviceId!)}>
                          {busyDeviceId === a.deviceId ? 'Working…' : 'Clear'}
                        </button>
                        <button className="btn-secondary" disabled={busyDeviceId === a.deviceId} onClick={() => block(a.deviceId!)}>
                          Block device
                        </button>
                      </div>
                    )}
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
