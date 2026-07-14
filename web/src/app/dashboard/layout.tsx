'use client';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { MyAccessResponse } from '@impact/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NAV_SOON_ITEMS } from './nav-config';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, campaigns, selectedCampaignId, selectCampaign, logout } = useAuth();
  const router = useRouter();
  const [access, setAccess] = useState<MyAccessResponse | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!selectedCampaignId) return;
    let cancelled = false;
    setAccess(null); // clear stale permissions immediately — never gate nav on the previous campaign's role
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

  if (loading || !user) {
    return <div className="centered-page">Loading…</div>;
  }

  const activeMembership = campaigns.find((c) => c.campaignId === selectedCampaignId) ?? campaigns[0];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/brand/logo.png" alt="" width={22} height={19} />
          <strong>Field Command</strong>
        </div>

        <div className="nav-section">
          <p className="nav-title">Workspace</p>
          <div className="nav-item active">Campaign Home</div>
        </div>

        {access && (
          <div className="nav-section">
            <p className="nav-title">Your access</p>
            {NAV_SOON_ITEMS.filter((item) => access.permissions.includes(item.requiredPermission)).map((item) => (
              <div key={item.label} className="nav-item disabled" title="Coming in a later phase — not built yet">
                {item.label}
                <span className="soon">soon</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          <p style={{ marginBottom: 8 }}>{user.fullName}</p>
          <button className="btn-secondary" onClick={() => logout().then(() => router.replace('/login'))}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div>{activeMembership && <span className="chip">{activeMembership.roleName}</span>}</div>
          {campaigns.length > 1 && (
            <select value={selectedCampaignId ?? ''} onChange={(e) => selectCampaign(e.target.value)}>
              {campaigns.map((c) => (
                <option key={c.campaignId} value={c.campaignId}>
                  {c.clientName} — {c.campaignName}
                </option>
              ))}
            </select>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
