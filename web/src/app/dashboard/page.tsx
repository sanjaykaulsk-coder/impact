'use client';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { CampaignBrandingResponse } from '@impact/shared';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { user, campaigns, selectedCampaignId } = useAuth();
  const [branding, setBranding] = useState<CampaignBrandingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCampaignId) return;
    let cancelled = false;
    setError(null);
    setBranding(null); // clear stale branding immediately so a failed fetch never shows the
    // previous campaign's colours/name under an unrelated error message
    api
      .campaignBranding(selectedCampaignId)
      .then((res) => {
        if (!cancelled) setBranding(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load branding');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCampaignId]);

  if (campaigns.length === 0) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h1>No campaigns yet</h1>
        <p className="subtitle">
          Your account, {user?.fullName}, has no active campaign role. Ask an administrator to assign
          one.
        </p>
      </div>
    );
  }

  return (
    <div>
      {branding && (
        <div
          className="branding-banner"
          style={{
            background: `linear-gradient(135deg, ${branding.theme.primaryColor}, ${branding.theme.secondaryColor})`,
          }}
        >
          <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>{branding.campaignName}</h1>
          <p style={{ margin: 0, opacity: 0.9 }}>{branding.clientName}</p>
          {branding.instructionsText && (
            <p style={{ marginTop: 14, fontSize: 14, maxWidth: 560 }}>{branding.instructionsText}</p>
          )}
        </div>
      )}
      {error && <div className="error-banner">{error}</div>}

      <div className="grid">
        <div className="stat-card">
          <div className="label">Signed in as</div>
          <div className="value" style={{ fontSize: 16 }}>
            {user?.fullName}
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Mobile</div>
          <div className="value" style={{ fontSize: 16 }}>
            {user?.mobileNumber}
          </div>
        </div>
        <div className="stat-card">
          <div className="label">Active campaigns</div>
          <div className="value">{campaigns.length}</div>
        </div>
        {branding?.escalationContactName && (
          <div className="stat-card">
            <div className="label">Escalation contact</div>
            <div className="value" style={{ fontSize: 16 }}>
              {branding.escalationContactName}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
