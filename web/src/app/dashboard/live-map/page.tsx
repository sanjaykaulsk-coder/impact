'use client';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { LiveMapPoint, LiveMapStatus } from '@impact/shared';
import { useCallback, useEffect, useState } from 'react';

// Spec §28's live map command centre. No map-tile library is installed in this repo — rather than
// sneak in a new dependency + API key decision as a side effect of this stage, this page lists
// every point with a "View on map" link out to Google Maps. See docs/ASSUMPTIONS.md A-070.
const STATUS_BADGE: Record<LiveMapStatus, string> = {
  RED_EXCEPTION: 'status-inactive',
  BLACK_OFFLINE: 'status-inactive',
  GREEN_ACTIVE: 'status-active',
  AMBER_DELAYED: 'status-inactive',
  BLUE_TRAVELLING: 'status-active',
  GREY_NOT_STARTED: 'status-inactive',
};

const mapsLink = (lat: string, lng: string) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

export default function LiveMapPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [points, setPoints] = useState<LiveMapPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);

  const load = useCallback(() => {
    if (!selectedCampaignId) return;
    setError(null);
    setLoading(true);
    api.dashboard
      .liveMap(selectedCampaignId)
      .then(setPoints)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the live map'))
      .finally(() => setLoading(false));
  }, [selectedCampaignId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!selectedCampaignId) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h1>No campaign selected</h1>
        <p className="subtitle">Select a campaign from the top bar to view the live map.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <h1>Live Map {activeCampaign ? `— ${activeCampaign.campaignName}` : ''}</h1>
        <button className="btn-secondary" onClick={load}>
          Refresh
        </button>
      </div>

      <p className="subtitle">
        Every field worker with an assignment today. Status: <strong>Exception</strong> (needs attention) →{' '}
        <strong>Offline</strong> (no signal in 2+ hours) → <strong>Active/completed</strong> → <strong>Delayed</strong> →{' '}
        <strong>Travelling</strong> → <strong>Not started</strong>, in that priority order.
      </p>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="subtitle">Loading…</p>}

      {!loading && points && (
        <div className="panel">
          {points.length === 0 ? (
            <p className="subtitle">No one is assigned today.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Team / vehicle</th>
                  <th>Status</th>
                  <th>Planned location</th>
                  <th>Last known location</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.userId}>
                    <td>{p.fullName}</td>
                    <td>
                      {p.teamName ?? '—'}
                      {p.vehicleInfo ? ` (${p.vehicleInfo})` : ''}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[p.status]}`}>{p.statusLabel}</span>
                    </td>
                    <td>{p.plannedLocation ? `${p.plannedLocation.name} (${p.plannedLocation.tehsil}, ${p.plannedLocation.district})` : '—'}</td>
                    <td>{p.lastKnownLocation ? new Date(p.lastKnownLocation.recordedAt).toLocaleString('en-IN') : 'No signal yet'}</td>
                    <td>
                      {p.lastKnownLocation ? (
                        <a href={mapsLink(p.lastKnownLocation.latitude, p.lastKnownLocation.longitude)} target="_blank" rel="noopener noreferrer">
                          View on map
                        </a>
                      ) : p.plannedLocation?.latitude && p.plannedLocation?.longitude ? (
                        <a href={mapsLink(p.plannedLocation.latitude, p.plannedLocation.longitude)} target="_blank" rel="noopener noreferrer">
                          View planned location
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
