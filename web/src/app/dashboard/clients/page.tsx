'use client';

import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ClientSummary, MyAccessResponse } from '@impact/shared';
import { useEffect, useState } from 'react';

interface ClientFormState {
  name: string;
  code: string;
  brandColorPrimary: string;
  brandColorSecondary: string;
}

const EMPTY_FORM: ClientFormState = { name: '', code: '', brandColorPrimary: '#1b5e3c', brandColorSecondary: '#f2a71b' };

export default function ClientsPage() {
  const { selectedCampaignId } = useAuth();
  const [access, setAccess] = useState<MyAccessResponse | null>(null);
  const [clients, setClients] = useState<ClientSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<ClientFormState>(EMPTY_FORM);
  const [createSaving, setCreateSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ClientFormState>(EMPTY_FORM);
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editSaving, setEditSaving] = useState(false);

  const canManage = access?.permissions.includes('manage_clients') ?? false;

  const loadClients = () => {
    setError(null);
    api
      .clients.list()
      .then(setClients)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load clients'));
  };

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (!selectedCampaignId) return;
    let cancelled = false;
    api
      .myAccess(selectedCampaignId)
      .then((res) => {
        if (!cancelled) setAccess(res);
      })
      .catch(() => {
        if (!cancelled) setAccess(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCampaignId]);

  const startEdit = (client: ClientSummary) => {
    setEditingId(client.id);
    setEditForm({
      name: client.name,
      code: client.code,
      brandColorPrimary: client.brandColorPrimary ?? '#1b5e3c',
      brandColorSecondary: client.brandColorSecondary ?? '#f2a71b',
    });
    setEditStatus(client.status);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSaving(true);
    setError(null);
    try {
      await api.clients.create({
        name: createForm.name,
        code: createForm.code.trim().toUpperCase(),
        brandColorPrimary: createForm.brandColorPrimary,
        brandColorSecondary: createForm.brandColorSecondary,
      });
      setCreateForm(EMPTY_FORM);
      setCreating(false);
      loadClients();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create client');
    } finally {
      setCreateSaving(false);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true);
    setError(null);
    try {
      await api.clients.update(editingId, {
        name: editForm.name,
        brandColorPrimary: editForm.brandColorPrimary,
        brandColorSecondary: editForm.brandColorSecondary,
        status: editStatus,
      });
      setEditingId(null);
      loadClients();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save client');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h1>Clients</h1>
        {canManage && !creating && (
          <button className="btn-primary inline" onClick={() => setCreating(true)}>
            + New client
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {creating && (
        <form className="panel" onSubmit={submitCreate}>
          <h2>New client</h2>
          <div className="form-grid">
            <div className="field">
              <label>Name</label>
              <input
                required
                minLength={2}
                maxLength={120}
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Code</label>
              <input
                required
                pattern="[A-Za-z0-9_\-]{2,24}"
                title="2-24 letters, digits, - or _"
                placeholder="e.g. ACME2026"
                value={createForm.code}
                onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Primary colour</label>
              <div className="color-field">
                <input
                  type="color"
                  value={createForm.brandColorPrimary}
                  onChange={(e) => setCreateForm((f) => ({ ...f, brandColorPrimary: e.target.value }))}
                />
                <span>{createForm.brandColorPrimary}</span>
              </div>
            </div>
            <div className="field">
              <label>Secondary colour</label>
              <div className="color-field">
                <input
                  type="color"
                  value={createForm.brandColorSecondary}
                  onChange={(e) => setCreateForm((f) => ({ ...f, brandColorSecondary: e.target.value }))}
                />
                <span>{createForm.brandColorSecondary}</span>
              </div>
            </div>
          </div>
          <div className="panel-actions">
            <button className="btn-primary inline" type="submit" disabled={createSaving}>
              {createSaving ? 'Creating…' : 'Create client'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setCreating(false);
                setCreateForm(EMPTY_FORM);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {editingId && (
        <form className="panel" onSubmit={submitEdit}>
          <h2>Edit client — {editForm.code}</h2>
          <div className="form-grid">
            <div className="field">
              <label>Name</label>
              <input
                required
                minLength={2}
                maxLength={120}
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="field">
              <label>Primary colour</label>
              <div className="color-field">
                <input
                  type="color"
                  value={editForm.brandColorPrimary}
                  onChange={(e) => setEditForm((f) => ({ ...f, brandColorPrimary: e.target.value }))}
                />
                <span>{editForm.brandColorPrimary}</span>
              </div>
            </div>
            <div className="field">
              <label>Secondary colour</label>
              <div className="color-field">
                <input
                  type="color"
                  value={editForm.brandColorSecondary}
                  onChange={(e) => setEditForm((f) => ({ ...f, brandColorSecondary: e.target.value }))}
                />
                <span>{editForm.brandColorSecondary}</span>
              </div>
            </div>
          </div>
          <div className="panel-actions">
            <button className="btn-primary inline" type="submit" disabled={editSaving}>
              {editSaving ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setEditingId(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="panel">
        {clients === null ? (
          <p className="subtitle">Loading…</p>
        ) : clients.length === 0 ? (
          <p className="subtitle">No clients yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Campaigns</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr
                  key={c.id}
                  className={canManage ? 'clickable' : undefined}
                  onClick={canManage ? () => startEdit(c) : undefined}
                >
                  <td>{c.name}</td>
                  <td>{c.code}</td>
                  <td>{c._count.campaigns}</td>
                  <td>
                    <span className={`badge status-${c.status.toLowerCase()}`}>{c.status}</span>
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
