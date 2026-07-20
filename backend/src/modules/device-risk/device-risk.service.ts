import { ForbiddenException, Injectable } from '@nestjs/common';
import { ExceptionSeverity, Prisma, RiskLevel } from '@prisma/client';
import { TenantContext } from '../../core/prisma/tenant-context';
import {
  DEFAULT_DEVICE_RISK_RULES,
  DeviceRiskSignal,
  RISK_LEVEL_ORDER,
  riskLevelRank,
} from './device-risk.constants';

const SEVERITY_FOR_LEVEL: Record<RiskLevel, ExceptionSeverity> = {
  L1_WARNING: 'LOW',
  L2_FLAGGED: 'MEDIUM',
  L3_RESTRICTED: 'HIGH',
  L4_BLOCKED: 'CRITICAL',
};

/**
 * Spec §18: "personally owned phones; absolute prevention is impossible — implement risk
 * detection, restriction and audit instead." This service is that: a signal fires, the campaign's
 * configured (or default) risk level for it is compared against the device's current level, and
 * only an *increase* ever writes anything — a device already at L3 seeing another L2 signal is a
 * no-op, not a downgrade.
 */
@Injectable()
export class DeviceRiskService {
  private resolveLevel(campaign: { deviceRiskRulesJson: Prisma.JsonValue }, signal: DeviceRiskSignal): RiskLevel {
    const rules = campaign.deviceRiskRulesJson as Record<string, string> | null;
    const configured = rules?.[signal];
    if (configured && (RISK_LEVEL_ORDER as string[]).includes(configured)) {
      return configured as RiskLevel;
    }
    return DEFAULT_DEVICE_RISK_RULES[signal];
  }

  /**
   * Records a detected signal against a device. Only escalates — never lowers a device's risk
   * level — and only writes an Alert (the supervisor review queue's source) when the level
   * actually changes, so a device already flagged doesn't accumulate a duplicate alert per event.
   */
  async recordSignal(
    tx: Prisma.TransactionClient,
    tenant: TenantContext,
    deviceId: string,
    signal: DeviceRiskSignal,
    evidence: Record<string, unknown>,
  ): Promise<void> {
    const device = await tx.device.findUnique({ where: { id: deviceId } });
    if (!device) return;

    const campaign = await tx.campaign.findUniqueOrThrow({ where: { id: tenant.campaignId } });
    const resolvedLevel = this.resolveLevel(campaign, signal);
    if (riskLevelRank(resolvedLevel) <= riskLevelRank(device.riskLevel)) return;

    await tx.device.update({
      where: { id: deviceId },
      data: {
        riskLevel: resolvedLevel,
        ...(resolvedLevel === 'L4_BLOCKED' ? { status: 'BLOCKED' as const } : {}),
      },
    });

    await tx.alert.create({
      data: {
        clientId: tenant.clientId,
        campaignId: tenant.campaignId,
        userId: tenant.userId,
        issueType: signal,
        severity: SEVERITY_FOR_LEVEL[resolvedLevel],
        status: 'OPEN',
        evidenceJson: { deviceId, ...evidence } as Prisma.InputJsonValue,
      },
    });
  }

  /** L3/L4 block starting or completing an activity outright (spec §18) until a supervisor acts. */
  async checkEnforcement(tx: Prisma.TransactionClient, deviceId: string): Promise<void> {
    const device = await tx.device.findUnique({ where: { id: deviceId } });
    if (!device) return;
    if (device.riskLevel === 'L3_RESTRICTED') {
      throw new ForbiddenException('This device is restricted pending supervisor review — contact your supervisor.');
    }
    if (device.riskLevel === 'L4_BLOCKED') {
      throw new ForbiddenException('This device has been blocked. Contact your administrator.');
    }
  }
}
