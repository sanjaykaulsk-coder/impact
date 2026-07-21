import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AlertStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../core/audit/audit.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';

// Spec §29's general in-app alert inbox — the Device Risk page (S4.2) already reads a filtered
// slice of this same Alert table for its own two signal types; this generalizes to every alert
// regardless of issueType, without touching that page's own read/clear/block paths at all.
@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  async list(tenant: TenantContext, status?: AlertStatus) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const alerts = await tx.alert.findMany({
        where: { campaignId: tenant.campaignId, ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' },
      });
      const userIds = [...new Set(alerts.flatMap((a) => [a.userId, a.ownerUserId].filter((id): id is string => !!id)))];
      const users = userIds.length ? await tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } }) : [];
      const nameById = new Map(users.map((u) => [u.id, u.fullName]));
      return alerts.map((a) => ({
        ...a,
        userFullName: a.userId ? (nameById.get(a.userId) ?? null) : null,
        ownerFullName: a.ownerUserId ? (nameById.get(a.ownerUserId) ?? null) : null,
      }));
    });
  }

  async acknowledge(tenant: TenantContext, alertId: string, actorUserId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const before = await this.findOrThrow(tx, tenant, alertId);
      if (before.status !== 'OPEN') throw new BadRequestException('Only an open alert can be acknowledged');

      const after = await tx.alert.update({ where: { id: alertId }, data: { status: 'ACKNOWLEDGED', ownerUserId: actorUserId } });
      await this.audit.record(tx, {
        clientId: tenant.clientId,
        campaignId: tenant.campaignId,
        actorUserId,
        action: 'ALERT_ACKNOWLEDGED',
        entityType: 'Alert',
        entityId: alertId,
        before,
        after,
      });
      return after;
    });
  }

  async resolve(tenant: TenantContext, alertId: string, actorUserId: string, remarks?: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const before = await this.findOrThrow(tx, tenant, alertId);
      if (before.status === 'RESOLVED') throw new BadRequestException('This alert is already resolved');

      const after = await tx.alert.update({
        where: { id: alertId },
        data: { status: 'RESOLVED', ...(remarks ? { remarks } : {}) },
      });
      await this.audit.record(tx, {
        clientId: tenant.clientId,
        campaignId: tenant.campaignId,
        actorUserId,
        action: 'ALERT_RESOLVED',
        entityType: 'Alert',
        entityId: alertId,
        before,
        after,
      });
      return after;
    });
  }

  /** Same reporting-manager-based escalation ExceptionsService uses — see its own escalate() for
   * the full reasoning on why a missing reporting line still lets the level bump without blocking. */
  async escalate(tenant: TenantContext, alertId: string, actorUserId: string) {
    const result = await this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const before = await this.findOrThrow(tx, tenant, alertId);
      if (before.status === 'RESOLVED') throw new BadRequestException('This alert is already resolved — nothing to escalate');

      let notificationIds: string[] = [];
      const currentOwnerId = before.ownerUserId ?? actorUserId;
      const ownerRole = await tx.userCampaignRole.findFirst({
        where: { userId: currentOwnerId, campaignId: tenant.campaignId, status: 'ACTIVE' },
        include: { reportingManager: { include: { user: { select: { id: true, fullName: true } } } } },
      });
      if (ownerRole?.reportingManager) {
        await tx.escalation.create({
          data: { alertId, fromRoleId: ownerRole.roleId, toRoleId: ownerRole.reportingManager.roleId, level: before.escalationLevel + 1 },
        });
        notificationIds = await this.notifications.queue(tx, {
          userId: ownerRole.reportingManager.userId,
          title: 'An alert has been escalated to you',
          body: `${before.issueType} (level ${before.escalationLevel + 1})`,
          relatedEntityType: 'Alert',
          relatedEntityId: alertId,
        });
      }

      const after = await tx.alert.update({
        where: { id: alertId },
        data: { status: 'ESCALATED', escalationLevel: { increment: 1 } },
      });
      await this.audit.record(tx, {
        clientId: tenant.clientId,
        campaignId: tenant.campaignId,
        actorUserId,
        action: 'ALERT_ESCALATED',
        entityType: 'Alert',
        entityId: alertId,
        before,
        after,
      });
      return { after, notificationIds };
    });

    await this.notifications.dispatch(result.notificationIds);
    return result.after;
  }

  private async findOrThrow(tx: Prisma.TransactionClient, tenant: TenantContext, alertId: string) {
    const alert = await tx.alert.findFirst({ where: { id: alertId, campaignId: tenant.campaignId } });
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }
}
