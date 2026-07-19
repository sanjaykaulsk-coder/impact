'use client';

import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ActivityTemplateSummary, MyAccessResponse } from '@impact/shared';
import { useEffect, useState } from 'react';

// Activity template library (spec §9.4): a fixed platform-wide catalogue of the 16 standard
// campaign types. Applying one generates a real starting workflow (Stage 3.2's builder) for this
// campaign — a genuine starting point the admin then customizes, never a hidden hard-coded path.
export default function ActivityTemplatesPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [access, setAccess] = useState<MyAccessResponse | null>(null);
  const [templates, setTemplates] = useState<ActivityTemplateSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);
  const canManage = access?.permissions.includes('manage_forms') ?? false;

  useEffect(() => {
    if (!selectedCampaignId) return;
    setError(null);
    setNotice(null);
    api.activityTemplates
      .list(selectedCampaignId)
      .then(setTemplates)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the template library'));
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

  const apply = async (template: ActivityTemplateSummary) => {
    if (!selectedCampaignId) return;
    const confirmed = window.confirm(
      `Apply "${template.name}" to this campaign?\n\n` +
        'This replaces the campaign\'s current workflow with the template\'s starting stages and ' +
        'milestones — any customizations already made will be overwritten. You can still edit ' +
        'everything afterward in Workflow Builder.',
    );
    if (!confirmed) return;

    setApplyingId(template.id);
    setError(null);
    setNotice(null);
    try {
      await api.activityTemplates.apply(selectedCampaignId, { activityTemplateId: template.id });
      setNotice(
        `"${template.name}" applied. Open Workflow Builder to review and customize the stages and milestones it created.`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not apply this template');
    } finally {
      setApplyingId(null);
    }
  };

  if (!selectedCampaignId) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h1>No campaign selected</h1>
        <p className="subtitle">Select a campaign from the top bar to browse activity templates.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <h1>Activity Templates — {activeCampaign?.campaignName ?? ''}</h1>
      </div>

      <p className="subtitle">
        Ready-made starting points for the 16 standard campaign types. Applying one builds a real
        workflow for this campaign — stages, milestones, and a pre-activity checklist — which you
        then adjust in Workflow Builder. The master template itself is never changed.
      </p>

      {error && <div className="error-banner">{error}</div>}
      {notice && <p className="subtitle">{notice}</p>}

      {templates === null ? (
        <p className="subtitle">Loading…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {templates.map((t) => (
            <div key={t.id} className="panel">
              <h3 style={{ marginTop: 0 }}>{t.name}</h3>
              <p className="subtitle">{t.description ?? 'No description'}</p>
              {canManage && (
                <button
                  className="btn-primary inline"
                  disabled={applyingId === t.id}
                  onClick={() => apply(t)}
                >
                  {applyingId === t.id ? 'Applying…' : 'Apply to this campaign'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
