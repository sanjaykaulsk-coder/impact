'use client';

import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { CampaignStatus, CampaignSummary, ClientSummary, Language, MyAccessResponse } from '@impact/shared';
import { useEffect, useState } from 'react';

// Mirrors backend/src/modules/campaigns/campaigns.service.ts's CAMPAIGN_TRANSITIONS exactly.
// Phase C has no shared-schema codegen (see shared/src/index.ts header), so this is hand-kept
// in sync — the backend is still the source of truth and re-validates every transition itself.
const CAMPAIGN_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ['CONFIGURATION_IN_PROGRESS'],
  CONFIGURATION_IN_PROGRESS: ['READY_FOR_REVIEW'],
  READY_FOR_REVIEW: ['APPROVED', 'CONFIGURATION_IN_PROGRESS'],
  APPROVED: ['PUBLISHED', 'CONFIGURATION_IN_PROGRESS'],
  PUBLISHED: ['LIVE'],
  LIVE: ['PAUSED', 'COMPLETED'],
  PAUSED: ['LIVE', 'COMPLETED'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [],
};

const STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: 'Draft',
  CONFIGURATION_IN_PROGRESS: 'Configuration in progress',
  READY_FOR_REVIEW: 'Ready for review',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  LIVE: 'Live',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

interface CreateFormState {
  clientId: string;
  name: string;
  code: string;
  reportingLanguage: Language;
  startDate: string;
  endDate: string;
  deviationToleranceMeters: string;
}

const EMPTY_CREATE_FORM: CreateFormState = {
  clientId: '',
  name: '',
  code: '',
  reportingLanguage: 'EN',
  startDate: '',
  endDate: '',
  deviationToleranceMeters: '250',
};

interface EditFormState {
  name: string;
  startDate: string;
  endDate: string;
  deviationToleranceMeters: string;
  reportingLanguage: Language;
}

interface BrandingFormState {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  campaignLogoUrl: string;
  homeBannerUrl: string;
  instructionsText: string;
  escalationContactName: string;
  escalationContactPhone: string;
}

const EMPTY_BRANDING_FORM: BrandingFormState = {
  primaryColor: '#1b5e3c',
  secondaryColor: '#f2a71b',
  logoUrl: '',
  campaignLogoUrl: '',
  homeBannerUrl: '',
  instructionsText: '',
  escalationContactName: '',
  escalationContactPhone: '',
};

export default function CampaignsPage() {
  const { selectedCampaignId } = useAuth();
  const [access, setAccess] = useState<MyAccessResponse | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null);
  const [clients, setClients] = useState<ClientSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_CREATE_FORM);
  const [createSaving, setCreateSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const [brandingForm, setBrandingForm] = useState<BrandingFormState>(EMPTY_BRANDING_FORM);
  const [brandingSaving, setBrandingSaving] = useState(false);

  const canManage = access?.permissions.includes('edit') ?? false;

  const loadCampaigns = () => {
    setError(null);
    api
      .campaignsBuilder.list()
      .then(setCampaigns)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load campaigns'));
  };

  useEffect(() => {
    loadCampaigns();
    api.clients.list().then(setClients).catch(() => setClients([]));
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

  const startEdit = async (campaign: CampaignSummary) => {
    setEditingId(campaign.id);
    setEditForm({
      name: campaign.name,
      startDate: campaign.startDate.slice(0, 10),
      endDate: campaign.endDate ? campaign.endDate.slice(0, 10) : '',
      deviationToleranceMeters: String(campaign.deviationToleranceMeters),
      reportingLanguage: campaign.reportingLanguage,
    });
    setBrandingForm(EMPTY_BRANDING_FORM);
    try {
      const branding = await api.campaignBranding(campaign.id);
      setBrandingForm({
        primaryColor: branding.theme.primaryColor ?? '#1b5e3c',
        secondaryColor: branding.theme.secondaryColor ?? '#f2a71b',
        logoUrl: branding.logoUrl ?? '',
        campaignLogoUrl: branding.campaignLogoUrl ?? '',
        homeBannerUrl: branding.homeBannerUrl ?? '',
        instructionsText: branding.instructionsText ?? '',
        escalationContactName: branding.escalationContactName ?? '',
        escalationContactPhone: branding.escalationContactPhone ?? '',
      });
    } catch {
      // No branding published yet for this campaign — the form starts from sensible defaults.
    }
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSaving(true);
    setError(null);
    try {
      await api.campaignsBuilder.create({
        clientId: createForm.clientId,
        name: createForm.name,
        code: createForm.code.trim().toUpperCase(),
        reportingLanguage: createForm.reportingLanguage,
        startDate: createForm.startDate,
        endDate: createForm.endDate || undefined,
        deviationToleranceMeters: Number(createForm.deviationToleranceMeters) || 250,
      });
      setCreateForm(EMPTY_CREATE_FORM);
      setCreating(false);
      loadCampaigns();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create campaign');
    } finally {
      setCreateSaving(false);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editForm) return;
    setEditSaving(true);
    setError(null);
    try {
      await api.campaignsBuilder.update(editingId, {
        name: editForm.name,
        startDate: editForm.startDate,
        endDate: editForm.endDate || undefined,
        deviationToleranceMeters: Number(editForm.deviationToleranceMeters) || undefined,
        reportingLanguage: editForm.reportingLanguage,
      });
      loadCampaigns();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save campaign');
    } finally {
      setEditSaving(false);
    }
  };

  const submitBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setBrandingSaving(true);
    setError(null);
    try {
      await api.campaignsBuilder.upsertBranding(editingId, {
        primaryColor: brandingForm.primaryColor,
        secondaryColor: brandingForm.secondaryColor,
        logoUrl: brandingForm.logoUrl || undefined,
        campaignLogoUrl: brandingForm.campaignLogoUrl || undefined,
        homeBannerUrl: brandingForm.homeBannerUrl || undefined,
        instructionsText: brandingForm.instructionsText || undefined,
        escalationContactName: brandingForm.escalationContactName || undefined,
        escalationContactPhone: brandingForm.escalationContactPhone || undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save branding');
    } finally {
      setBrandingSaving(false);
    }
  };

  const runTransition = async (campaignId: string, toStatus: CampaignStatus) => {
    setTransitioning(true);
    setError(null);
    try {
      await api.campaignsBuilder.transition(campaignId, toStatus);
      loadCampaigns();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change campaign status');
    } finally {
      setTransitioning(false);
    }
  };

  const editingCampaign = campaigns?.find((c) => c.id === editingId) ?? null;

  return (
    <div>
      <div className="toolbar">
        <h1>Campaigns</h1>
        {canManage && !creating && (
          <button className="btn-primary inline" onClick={() => setCreating(true)}>
            + New campaign
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {creating && (
        <form className="panel" onSubmit={submitCreate}>
          <h2>New campaign</h2>
          <div className="form-grid">
            <div className="field">
              <label>Client</label>
              <select
                required
                value={createForm.clientId}
                onChange={(e) => setCreateForm((f) => ({ ...f, clientId: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
              >
                <option value="" disabled>
                  Select a client…
                </option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Name</label>
              <input
                required
                minLength={2}
                maxLength={160}
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Code</label>
              <input
                required
                pattern="[A-Za-z0-9_\-]{2,48}"
                title="2-48 letters, digits, - or _"
                placeholder="e.g. SHAKTI-UP-VAN-2027"
                value={createForm.code}
                onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Reporting language</label>
              <select
                value={createForm.reportingLanguage}
                onChange={(e) => setCreateForm((f) => ({ ...f, reportingLanguage: e.target.value as Language }))}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
              >
                <option value="EN">English</option>
                <option value="HI">Hindi</option>
              </select>
            </div>
            <div className="field">
              <label>Start date</label>
              <input
                required
                type="date"
                value={createForm.startDate}
                onChange={(e) => setCreateForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>End date (optional)</label>
              <input
                type="date"
                value={createForm.endDate}
                onChange={(e) => setCreateForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>GPS deviation tolerance (metres)</label>
              <input
                type="number"
                min={0}
                max={5000}
                value={createForm.deviationToleranceMeters}
                onChange={(e) => setCreateForm((f) => ({ ...f, deviationToleranceMeters: e.target.value }))}
              />
            </div>
          </div>
          <div className="panel-actions">
            <button className="btn-primary inline" type="submit" disabled={createSaving}>
              {createSaving ? 'Creating…' : 'Create campaign'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setCreating(false);
                setCreateForm(EMPTY_CREATE_FORM);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {editingId && editForm && editingCampaign && (
        <>
          <form className="panel" onSubmit={submitEdit}>
            <h2>
              Edit campaign — {editingCampaign.code}{' '}
              <span className={`badge status-active`} style={{ marginLeft: 8 }}>
                {STATUS_LABEL[editingCampaign.status]}
              </span>
            </h2>
            <div className="form-grid">
              <div className="field">
                <label>Name</label>
                <input
                  required
                  minLength={2}
                  maxLength={160}
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, name: e.target.value } : f))}
                />
              </div>
              <div className="field">
                <label>Reporting language</label>
                <select
                  value={editForm.reportingLanguage}
                  onChange={(e) =>
                    setEditForm((f) => (f ? { ...f, reportingLanguage: e.target.value as Language } : f))
                  }
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
                >
                  <option value="EN">English</option>
                  <option value="HI">Hindi</option>
                </select>
              </div>
              <div className="field">
                <label>Start date</label>
                <input
                  required
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, startDate: e.target.value } : f))}
                />
              </div>
              <div className="field">
                <label>End date</label>
                <input
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, endDate: e.target.value } : f))}
                />
              </div>
              <div className="field">
                <label>GPS deviation tolerance (metres)</label>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  value={editForm.deviationToleranceMeters}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, deviationToleranceMeters: e.target.value } : f))}
                />
              </div>
            </div>
            <div className="panel-actions">
              <button className="btn-primary inline" type="submit" disabled={editSaving}>
                {editSaving ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditingId(null)}>
                Close
              </button>
            </div>

            {CAMPAIGN_TRANSITIONS[editingCampaign.status].length > 0 && (
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--text-muted)' }}>
                  Move status to
                </label>
                <div className="panel-actions">
                  {CAMPAIGN_TRANSITIONS[editingCampaign.status].map((toStatus) => (
                    <button
                      key={toStatus}
                      type="button"
                      className="btn-secondary"
                      disabled={transitioning}
                      onClick={() => runTransition(editingCampaign.id, toStatus)}
                    >
                      {STATUS_LABEL[toStatus]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>

          <form className="panel" onSubmit={submitBranding}>
            <h2>Branding — {editingCampaign.code}</h2>
            <div className="form-grid">
              <div className="field">
                <label>Primary colour</label>
                <div className="color-field">
                  <input
                    type="color"
                    value={brandingForm.primaryColor}
                    onChange={(e) => setBrandingForm((f) => ({ ...f, primaryColor: e.target.value }))}
                  />
                  <span>{brandingForm.primaryColor}</span>
                </div>
              </div>
              <div className="field">
                <label>Secondary colour</label>
                <div className="color-field">
                  <input
                    type="color"
                    value={brandingForm.secondaryColor}
                    onChange={(e) => setBrandingForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                  />
                  <span>{brandingForm.secondaryColor}</span>
                </div>
              </div>
              <div className="field">
                <label>Escalation contact name</label>
                <input
                  value={brandingForm.escalationContactName}
                  onChange={(e) => setBrandingForm((f) => ({ ...f, escalationContactName: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Escalation contact phone</label>
                <input
                  value={brandingForm.escalationContactPhone}
                  onChange={(e) => setBrandingForm((f) => ({ ...f, escalationContactPhone: e.target.value }))}
                />
              </div>
            </div>
            <div className="field">
              <label>Field instructions</label>
              <input
                value={brandingForm.instructionsText}
                onChange={(e) => setBrandingForm((f) => ({ ...f, instructionsText: e.target.value }))}
              />
            </div>
            <div className="panel-actions">
              <button className="btn-primary inline" type="submit" disabled={brandingSaving}>
                {brandingSaving ? 'Saving…' : 'Save branding'}
              </button>
            </div>
          </form>
        </>
      )}

      <div className="panel">
        {campaigns === null ? (
          <p className="subtitle">Loading…</p>
        ) : campaigns.length === 0 ? (
          <p className="subtitle">No campaigns yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Client</th>
                <th>Code</th>
                <th>Status</th>
                <th>Start</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className={canManage ? 'clickable' : undefined} onClick={canManage ? () => startEdit(c) : undefined}>
                  <td>{c.name}</td>
                  <td>{c.client.name}</td>
                  <td>{c.code}</td>
                  <td>
                    <span className="badge status-active">{STATUS_LABEL[c.status]}</span>
                  </td>
                  <td>{c.startDate.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
