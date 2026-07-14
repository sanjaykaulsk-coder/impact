'use client';

import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { AssignmentStatus, AssignmentSummary, AvailableAssignmentUser, AvailablePjpRow, MyAccessResponse } from '@impact/shared';
import { useEffect, useState } from 'react';

const STATUS_OPTIONS: AssignmentStatus[] = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export default function AssignmentsPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [access, setAccess] = useState<MyAccessResponse | null>(null);
  const [assignments, setAssignments] = useState<AssignmentSummary[] | null>(null);
  const [users, setUsers] = useState<AvailableAssignmentUser[]>([]);
  const [rows, setRows] = useState<AvailablePjpRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newRowId, setNewRowId] = useState('');
  const [newDate, setNewDate] = useState('');
  const [createSaving, setCreateSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<AssignmentStatus>('ASSIGNED');
  const [editSaving, setEditSaving] = useState(false);

  const canManage = access?.permissions.includes('allocate') ?? false;
  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);

  const loadAll = () => {
    if (!selectedCampaignId) return;
    setError(null);
    api.assignments.list(selectedCampaignId).then(setAssignments).catch((err) => setError(err instanceof Error ? err.message : 'Could not load assignments'));
    if (canManage) {
      api.assignments.availableUsers(selectedCampaignId).then(setUsers).catch(() => setUsers([]));
      api.assignments.availableRows(selectedCampaignId).then(setRows).catch(() => setRows([]));
    }
  };

  useEffect(() => {
    loadAll();
    setEditingId(null);
    setCreating(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaignId, canManage]);

  useEffect(() => {
    if (!selectedCampaignId) return;
    let cancelled = false;
    api.myAccess(selectedCampaignId).then((res) => {
      if (!cancelled) setAccess(res);
    }).catch(() => {
      if (!cancelled) setAccess(null);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedCampaignId]);

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId) return;
    setCreateSaving(true);
    setError(null);
    try {
      await api.assignments.create(selectedCampaignId, {
        userId: newUserId,
        pjpRowId: newRowId || undefined,
        assignmentDate: newDate,
      });
      setNewUserId('');
      setNewRowId('');
      setNewDate('');
      setCreating(false);
      loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create assignment');
    } finally {
      setCreateSaving(false);
    }
  };

  const startEdit = (a: AssignmentSummary) => {
    setEditingId(a.id);
    setEditStatus(a.status);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId || !editingId) return;
    setEditSaving(true);
    setError(null);
    try {
      await api.assignments.update(selectedCampaignId, editingId, { status: editStatus });
      setEditingId(null);
      loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update assignment');
    } finally {
      setEditSaving(false);
    }
  };

  if (!selectedCampaignId) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h1>No campaign selected</h1>
        <p className="subtitle">Select a campaign from the top bar to manage assignments.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <h1>Assignments — {activeCampaign?.campaignName ?? ''}</h1>
        {canManage && !creating && (
          <button className="btn-primary inline" onClick={() => setCreating(true)}>
            + New assignment
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {creating && (
        <form className="panel" onSubmit={submitCreate}>
          <h2>New assignment</h2>
          <div className="form-grid">
            <div className="field">
              <label>User</label>
              <select
                required
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
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
            <div className="field">
              <label>PJP row (optional)</label>
              <select
                value={newRowId}
                onChange={(e) => setNewRowId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
              >
                <option value="">— none —</option>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.date.slice(0, 10)} — {r.locationName} ({r.districtName})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Assignment date</label>
              <input required type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
          </div>
          {rows.length === 0 && <p className="subtitle">No published PJP rows yet — you can still assign without one.</p>}
          <div className="panel-actions">
            <button className="btn-primary inline" type="submit" disabled={createSaving}>
              {createSaving ? 'Creating…' : 'Create assignment'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {editingId && (
        <form className="panel" onSubmit={submitEdit}>
          <h2>Update assignment status</h2>
          <div className="field">
            <label>Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as AssignmentStatus)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="panel-actions">
            <button className="btn-primary inline" type="submit" disabled={editSaving}>
              {editSaving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setEditingId(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="panel">
        {assignments === null ? (
          <p className="subtitle">Loading…</p>
        ) : assignments.length === 0 ? (
          <p className="subtitle">No assignments yet for this campaign.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Location</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} className={canManage ? 'clickable' : undefined} onClick={canManage ? () => startEdit(a) : undefined}>
                  <td>{a.userFullName ?? '(unknown)'}</td>
                  <td>{a.pjpRow ? `${a.pjpRow.locationName} (${a.pjpRow.districtName})` : '—'}</td>
                  <td>{a.assignmentDate.slice(0, 10)}</td>
                  <td>
                    <span className={`badge status-${a.status === 'ASSIGNED' || a.status === 'IN_PROGRESS' || a.status === 'COMPLETED' ? 'active' : 'inactive'}`}>
                      {a.status}
                    </span>
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
