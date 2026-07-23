'use client';

import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { KPI_KEYS, KPI_KEY_LABELS } from '@impact/shared';
import type { MyAccessResponse, TargetResponse } from '@impact/shared';
import { useEffect, useState } from 'react';

// Target (spec §34) drives the "target vs achievement" line of the Weekly and Campaign Closure
// reports. Campaign-wide only for now — geography/team/user-scoped targets are schema-supported
// but not yet reachable from this page (docs/ASSUMPTIONS.md A-072).

interface TargetFormState {
  kpiKey: string;
  targetValue: string;
  periodStart: string;
  periodEnd: string;
}

const EMPTY_FORM: TargetFormState = {
  kpiKey: KPI_KEYS[0],
  targetValue: '',
  periodStart: '',
  periodEnd: '',
};

export default function TargetsPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [access, setAccess] = useState<MyAccessResponse | null>(null);
  const [targets, setTargets] = useState<TargetResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<TargetFormState>(EMPTY_FORM);
  const [createSaving, setCreateSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const canManage = access?.permissions.includes('manage_forms') ?? false;
  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);

  const loadTargets = () => {
    if (!selectedCampaignId) return;
    setError(null);
    api.targets
      .list(selectedCampaignId)
      .then(setTargets)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load targets'));
  };

  useEffect(() => {
    loadTargets();
    setCreating(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaignId]);

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

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId) return;
    setCreateSaving(true);
    setError(null);
    try {
      await api.targets.create(selectedCampaignId, {
        kpiKey: createForm.kpiKey,
        targetValue: Number(createForm.targetValue),
        periodStart: createForm.periodStart || undefined,
        periodEnd: createForm.periodEnd || undefined,
      });
      setCreating(false);
      setCreateForm(EMPTY_FORM);
      loadTargets();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create target');
    } finally {
      setCreateSaving(false);
    }
  };

  const remove = async (targetId: string) => {
    if (!selectedCampaignId) return;
    setRemovingId(targetId);
    setError(null);
    try {
      await api.targets.remove(selectedCampaignId, targetId);
      loadTargets();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove target');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h1>Targets {activeCampaign ? `— ${activeCampaign.campaignName}` : ''}</h1>
        {canManage && !creating && (
          <button className="btn-primary inline" onClick={() => setCreating(true)}>
            + New Target
          </button>
        )}
      </div>

      <p className="subtitle">
        Campaign-wide KPI targets, compared against real numbers on the Weekly and Campaign Closure
        reports. Leave the period blank for a target that applies to any date range.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {creating && (
        <form className="panel" onSubmit={submitCreate}>
          <h2>New Target</h2>
          <div className="form-grid">
            <div className="field">
              <label>KPI</label>
              <select
                value={createForm.kpiKey}
                onChange={(e) => setCreateForm((f) => ({ ...f, kpiKey: e.target.value }))}
              >
                {KPI_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {KPI_KEY_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Target value</label>
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={createForm.targetValue}
                onChange={(e) => setCreateForm((f) => ({ ...f, targetValue: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Period start (optional)</label>
              <input
                type="date"
                value={createForm.periodStart}
                onChange={(e) => setCreateForm((f) => ({ ...f, periodStart: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Period end (optional)</label>
              <input
                type="date"
                value={createForm.periodEnd}
                onChange={(e) => setCreateForm((f) => ({ ...f, periodEnd: e.target.value }))}
              />
            </div>
          </div>
          <div className="panel-actions">
            <button className="btn-primary inline" type="submit" disabled={createSaving}>
              {createSaving ? 'Creating…' : 'Create target'}
            </button>
            <button className="btn-secondary inline" type="button" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {!targets ? (
        <p className="subtitle">Loading…</p>
      ) : targets.length === 0 ? (
        <p className="subtitle">
          No targets set yet — the Weekly and Campaign Closure reports will show "no targets
          configured" until you add one.
        </p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>KPI</th>
              <th>Target value</th>
              <th>Period start</th>
              <th>Period end</th>
              {canManage && <th />}
            </tr>
          </thead>
          <tbody>
            {targets.map((t) => (
              <tr key={t.id}>
                <td>{KPI_KEY_LABELS[t.kpiKey as (typeof KPI_KEYS)[number]] ?? t.kpiKey}</td>
                <td>{t.targetValue}</td>
                <td>{t.periodStart ? new Date(t.periodStart).toLocaleDateString('en-IN') : '—'}</td>
                <td>{t.periodEnd ? new Date(t.periodEnd).toLocaleDateString('en-IN') : '—'}</td>
                {canManage && (
                  <td>
                    <button className="btn-secondary inline" disabled={removingId === t.id} onClick={() => remove(t.id)}>
                      {removingId === t.id ? 'Removing…' : 'Remove'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
