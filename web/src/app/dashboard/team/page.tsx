'use client';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { DelayedActivityRow, TeamAttendanceRow, TeamPerformanceRow, UnsyncedUserRow } from '@impact/shared';
import { useCallback, useEffect, useState } from 'react';

// Spec §25's "team dashboard" screen, narrowed to what S5.1 names: attendance, unsynced users,
// delayed activities, team performance. Reassignment lives on the Assignments page instead — it's
// an action on an existing record, not a dashboard view.
type Tab = 'ATTENDANCE' | 'UNSYNCED' | 'DELAYED' | 'PERFORMANCE';

const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '—';

export default function TeamDashboardPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [tab, setTab] = useState<Tab>('ATTENDANCE');
  const [attendance, setAttendance] = useState<TeamAttendanceRow[] | null>(null);
  const [unsynced, setUnsynced] = useState<UnsyncedUserRow[] | null>(null);
  const [delayed, setDelayed] = useState<DelayedActivityRow[] | null>(null);
  const [performance, setPerformance] = useState<TeamPerformanceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);

  const load = useCallback(() => {
    if (!selectedCampaignId) return;
    setError(null);
    setLoading(true);
    const request =
      tab === 'ATTENDANCE'
        ? api.teamDashboard.attendance(selectedCampaignId).then(setAttendance)
        : tab === 'UNSYNCED'
          ? api.teamDashboard.unsyncedUsers(selectedCampaignId).then(setUnsynced)
          : tab === 'DELAYED'
            ? api.teamDashboard.delayedActivities(selectedCampaignId).then(setDelayed)
            : api.teamDashboard.performance(selectedCampaignId).then(setPerformance);
    request
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the team dashboard'))
      .finally(() => setLoading(false));
  }, [selectedCampaignId, tab]);

  useEffect(() => {
    load();
  }, [load]);

  if (!selectedCampaignId) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h1>No campaign selected</h1>
        <p className="subtitle">Select a campaign from the top bar to view the team dashboard.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <h1>Team Dashboard {activeCampaign ? `— ${activeCampaign.campaignName}` : ''}</h1>
      </div>

      <div className="panel-actions" style={{ marginBottom: 12 }}>
        <button className={tab === 'ATTENDANCE' ? 'btn-primary inline' : 'btn-secondary'} onClick={() => setTab('ATTENDANCE')}>
          Attendance
        </button>
        <button className={tab === 'UNSYNCED' ? 'btn-primary inline' : 'btn-secondary'} onClick={() => setTab('UNSYNCED')}>
          Unsynced users
        </button>
        <button className={tab === 'DELAYED' ? 'btn-primary inline' : 'btn-secondary'} onClick={() => setTab('DELAYED')}>
          Delayed activities
        </button>
        <button className={tab === 'PERFORMANCE' ? 'btn-primary inline' : 'btn-secondary'} onClick={() => setTab('PERFORMANCE')}>
          Team performance
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="subtitle">Loading…</p>}

      {tab === 'ATTENDANCE' && attendance && !loading && (
        <div className="panel">
          <p className="subtitle">Today’s day-start / day-end for everyone with an active role on this campaign.</p>
          {attendance.length === 0 ? (
            <p className="subtitle">No campaign members found.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Day started</th>
                  <th>Day ended</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((a) => (
                  <tr key={a.userId}>
                    <td>{a.fullName}</td>
                    <td>{a.roleName}</td>
                    <td>{fmtTime(a.dayStart)}</td>
                    <td>{fmtTime(a.dayEnd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'UNSYNCED' && unsynced && !loading && (
        <div className="panel">
          <p className="subtitle">
            Field workers assigned today whose phone hasn’t sent anything to the server recently — a check-in, a
            check-out, a GPS point, or an attendance mark. This can’t see data still sitting unsent on a phone (that’s
            the nature of offline-first); it’s a proxy for “we haven’t heard from this device in a while.”
          </p>
          {unsynced.length === 0 ? (
            <p className="subtitle">Everyone assigned today has been heard from recently.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {unsynced.map((u) => (
                  <tr key={u.userId}>
                    <td>{u.fullName}</td>
                    <td>{u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString('en-IN') : 'Not seen today'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'DELAYED' && delayed && !loading && (
        <div className="panel">
          <p className="subtitle">Today’s scheduled stops running behind their planned check-in/check-out window.</p>
          {delayed.length === 0 ? (
            <p className="subtitle">Nothing is running late right now.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>User</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {delayed.map((d) => (
                  <tr key={`${d.pjpRowId}-${d.userId}`}>
                    <td>{d.locationName}</td>
                    <td>{d.userFullName}</td>
                    <td>
                      <span className="badge status-inactive">{d.reason}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'PERFORMANCE' && performance && !loading && (
        <div className="panel">
          <p className="subtitle">Assignment outcomes for today, per team member.</p>
          {performance.length === 0 ? (
            <p className="subtitle">No assignments today.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Assigned</th>
                  <th>In progress</th>
                  <th>Completed</th>
                  <th>Cancelled</th>
                  <th>Completion rate</th>
                </tr>
              </thead>
              <tbody>
                {performance.map((p) => (
                  <tr key={p.userId}>
                    <td>{p.fullName}</td>
                    <td>{p.assigned}</td>
                    <td>{p.inProgress}</td>
                    <td>{p.completed}</td>
                    <td>{p.cancelled}</td>
                    <td>{p.completionRate}%</td>
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
