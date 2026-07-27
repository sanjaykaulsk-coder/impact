'use client';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { MediaReviewItem } from '@impact/shared';
import { useEffect, useState } from 'react';

const QUALITY_FLAG_LABELS: Record<string, string> = {
  BLURRY: 'Blurry',
  TOO_DARK: 'Too dark',
  TOO_BRIGHT: 'Overexposed',
  LOW_RESOLUTION: 'Low resolution',
};

// Spec §25/§40's "Media review" supervisor screen, never built until this backlog item. Quality
// flags are real, computed server-side at upload time (blur/brightness/resolution — no external
// service). The content-classification badge is always MOCK — spec §42 says keep the architecture
// ready for AI image analysis, not that this environment has a real cloud vision provider wired
// up; the badge exists so that's never presented as more than it is.
export default function MediaReviewPage() {
  const { selectedCampaignId, campaigns } = useAuth();
  const [items, setItems] = useState<MediaReviewItem[] | null>(null);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCampaign = campaigns.find((c) => c.campaignId === selectedCampaignId);

  const load = () => {
    if (!selectedCampaignId) return;
    setError(null);
    setItems(null);
    api.supervisor
      .mediaReview(selectedCampaignId, flaggedOnly)
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load media'));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaignId, flaggedOnly]);

  if (!selectedCampaignId) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h1>No campaign selected</h1>
        <p className="subtitle">Select a campaign from the top bar to review media.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <h1>Media Review — {activeCampaign?.campaignName ?? ''}</h1>
      </div>

      <p className="subtitle">
        Every evidence photo, newest first (most recent 200). Quality flags (blurry, too dark, overexposed, low
        resolution) are computed automatically from the real photo — no field worker action needed to trigger
        them. The &quot;content&quot; badge is a placeholder for future AI-based checks (e.g. verifying branding
        is actually visible) and is clearly marked MOCK until a real vision provider is connected.
      </p>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
        Show quality-flagged photos only
      </label>

      {error && <div className="error-banner">{error}</div>}

      <div className="panel">
        {items === null ? (
          <p className="subtitle">Loading…</p>
        ) : items.length === 0 ? (
          <p className="subtitle">{flaggedOnly ? 'No quality-flagged photos.' : 'No evidence photos yet.'}</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {items.map((item) => (
              <a
                key={item.mediaId}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'block', width: 240, textDecoration: 'none', color: 'inherit' }}
              >
                <img
                  src={item.url}
                  alt="Evidence — watermarked with location, time, GPS and field user"
                  style={{ width: 240, height: 180, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', display: 'block' }}
                />
                <div style={{ padding: '8px 2px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{item.locationName}</div>
                  <div className="subtitle" style={{ fontSize: 12 }}>
                    {item.uploadedByName} · {item.capturedAt ? new Date(item.capturedAt).toLocaleString() : '—'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {item.qualityFlags.map((flag) => (
                      <span key={flag} className="badge status-inactive">
                        {QUALITY_FLAG_LABELS[flag] ?? flag}
                      </span>
                    ))}
                    {item.qualityFlags.length === 0 && (
                      <span className="badge status-active">Quality OK</span>
                    )}
                    {item.contentClassification?.mock && (
                      <span className="badge status-inactive" title={item.contentClassification.note}>
                        Content: MOCK
                      </span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
