'use client';

import type { MeResponse, MyCampaignSummary } from '@impact/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from './api';

interface AuthState {
  loading: boolean;
  user: MeResponse | null;
  campaigns: MyCampaignSummary[];
  selectedCampaignId: string | null;
  selectCampaign: (campaignId: string) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MeResponse | null>(null);
  const [campaigns, setCampaigns] = useState<MyCampaignSummary[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tokenStore.access) {
      setUser(null);
      setCampaigns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [me, myCampaigns] = await Promise.all([api.me(), api.myCampaigns()]);
      setUser(me);
      setCampaigns(myCampaigns);
      setSelectedCampaignId((prev) => prev ?? myCampaigns[0]?.campaignId ?? null);
    } catch {
      tokenStore.clear();
      setUser(null);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      tokenStore.clear();
      setUser(null);
      setCampaigns([]);
      setSelectedCampaignId(null);
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      user,
      campaigns,
      selectedCampaignId,
      selectCampaign: setSelectedCampaignId,
      refresh,
      logout,
    }),
    [loading, user, campaigns, selectedCampaignId, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
