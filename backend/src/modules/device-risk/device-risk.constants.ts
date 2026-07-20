import { RiskLevel } from '@prisma/client';

// Signal identifiers this session actually detects — a small, honest subset of spec §18's full
// 18-signal list. The rest (rooted device, emulator, APK tampering, overlay/accessibility abuse,
// screenshot evidence, etc.) need native Android detection code this session doesn't build — see
// docs/ASSUMPTIONS.md for why. Both signals below are computed entirely from data the backend
// already has, at call sites that already run inside a tenant/campaign context.
export type DeviceRiskSignal = 'DEVICE_TIME_MISMATCH' | 'MOCK_LOCATION_SUSPECTED';

// Alert.issueType values that belong to the device-risk queue, as opposed to any other kind of
// Alert a future stage might create (e.g. S5.2's broader exception/alert engine).
export const DEVICE_RISK_SIGNAL_TYPES: DeviceRiskSignal[] = ['DEVICE_TIME_MISMATCH', 'MOCK_LOCATION_SUSPECTED'];

export const RISK_LEVEL_ORDER: RiskLevel[] = ['L1_WARNING', 'L2_FLAGGED', 'L3_RESTRICTED', 'L4_BLOCKED'];

export function riskLevelRank(level: RiskLevel): number {
  return RISK_LEVEL_ORDER.indexOf(level);
}

// Defaults, overridable per campaign via Campaign.deviceRiskRulesJson (spec §18: "configurable
// risk levels"). A clock a few minutes off is often an innocent misconfiguration, so it's flagged
// for review rather than blocking outright; an impossible GPS jump is a much stronger signal of
// active manipulation, so it restricts pending supervisor action.
export const DEFAULT_DEVICE_RISK_RULES: Record<DeviceRiskSignal, RiskLevel> = {
  DEVICE_TIME_MISMATCH: 'L2_FLAGGED',
  MOCK_LOCATION_SUSPECTED: 'L3_RESTRICTED',
};

export const DEVICE_TIME_MISMATCH_THRESHOLD_MS = 5 * 60 * 1000;
