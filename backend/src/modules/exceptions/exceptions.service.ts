import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExceptionStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../core/audit/audit.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';

// Spec §30's exact 8-state lifecycle. Reopened loops back to Acknowledged (spec doesn't say the
// full loop-back point explicitly, but "someone needs to look at this again" is the same starting
// posture as a fresh Acknowledged ticket, not a bare Detected one — it already has history).
const VALID_TRANSITIONS: Record<ExceptionStatus, ExceptionStatus[]> = {
  DETECTED: ['ASSIGNED', 'ACKNOWLEDGED'],
  ASSIGNED: ['ACKNOWLEDGED'],
  ACKNOWLEDGED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['ACTION_TAKEN'],
  ACTION_TAKEN: ['RESOLVED'],
  RESOLVED: ['CLOSURE_APPROVED', 'REOPENED'],
  CLOSURE_APPROVED: ['REOPENED'],
  REOPENED: ['ACKNOWLEDGED'],
};

@Injectable()
export class ExceptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}

  async list(tenant: TenantContext, status?: ExceptionStatus) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const exceptions = await tx.exception.findMany({
        where: { campaignId: tenant.campaignId, ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' },
      });
      return this.enrichMany(tx, exceptions);
    });
  }

  async detail(tenant: TenantContext, exceptionId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const exception = await this.findOrThrow(tx, tenant, exceptionId);
      const [enriched] = await this.enrichMany(tx, [exception]);
      return enriched;
    });
  }

  async assign(tenant: TenantContext, exceptionId: string, actorUserId: string, ownerUserId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const before = await this.findOrThrow(tx, tenant, exceptionId);
      this.assertTransition(before.status, 'ASSIGNED');

      const membership = await tx.userCampaignRole.findFirst({
        where: { userId: ownerUserId, campaignId: tenant.campaignId, status: 'ACTIVE' },
      });
      if (!membership) throw new BadRequestException('That user does not hold an active role in this campaign');

      const after = await tx.exception.update({ where: { id: exceptionId }, data: { status: 'ASSIGNED', ownerUserId } });
      await this.recordAudit(tx, tenant, actorUserId, 'EXCEPTION_ASSIGNED', exceptionId, before, after);

      const notificationIds = await this.notifications.queue(tx, {
        userId: ownerUserId,
        title: 'An exception has been assigned to you',
        body: `${before.category}: ${before.remarks ?? 'See the exception detail for evidence.'}`,
        relatedEntityType: 'Exception',
        relatedEntityId: exceptionId,
      });
      return { after, notificationIds };
    }).then(async ({ after, notificationIds }) => {
      await this.notifications.dispatch(notificationIds);
      const [enriched] = await this.prisma.runInTenantContext(tenant.clientId, (tx) => this.enrichMany(tx, [after]));
      return enriched;
    });
  }

  async acknowledge(tenant: TenantContext, exceptionId: string, actorUserId: string) {
    return this.transition(tenant, exceptionId, actorUserId, 'ACKNOWLEDGED', 'EXCEPTION_ACKNOWLEDGED', {});
  }

  async startReview(tenant: TenantContext, exceptionId: string, actorUserId: string) {
    return this.transition(tenant, exceptionId, actorUserId, 'UNDER_REVIEW', 'EXCEPTION_REVIEW_STARTED', {});
  }

  async actionTaken(tenant: TenantContext, exceptionId: string, actorUserId: string, remarks: string) {
    return this.transition(tenant, exceptionId, actorUserId, 'ACTION_TAKEN', 'EXCEPTION_ACTION_TAKEN', { remarks });
  }

  async resolve(tenant: TenantContext, exceptionId: string, actorUserId: string, resolution: string) {
    return this.transition(tenant, exceptionId, actorUserId, 'RESOLVED', 'EXCEPTION_RESOLVED', { resolution, resolvedAt: new Date() });
  }

  async approveClosure(tenant: TenantContext, exceptionId: string, actorUserId: string) {
    return this.transition(tenant, exceptionId, actorUserId, 'CLOSURE_APPROVED', 'EXCEPTION_CLOSURE_APPROVED', {
      closureApprovedByUserId: actorUserId,
    });
  }

  async reopen(tenant: TenantContext, exceptionId: string, actorUserId: string, remarks: string) {
    return this.transition(tenant, exceptionId, actorUserId, 'REOPENED', 'EXCEPTION_REOPENED', { remarks, resolvedAt: null });
  }

  /**
   * Bumps the escalation level and, where the current owner's campaign role has a configured
   * reporting manager (UserCampaignRole.reportingManagerId — the same reporting-line field the
   * schema already carries), creates a real Escalation row targeting that manager's role and
   * notifies them. If no owner is set yet, or the owner's reporting line isn't configured, the
   * level still bumps (so a supervisor always has a way to flag "this has sat too long") but no
   * Escalation row or notification is created — logged as a known gap (A-069), not silently
   * pretended to have escalated to someone.
   */
  async escalate(tenant: TenantContext, exceptionId: string, actorUserId: string) {
    const result = await this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const before = await this.findOrThrow(tx, tenant, exceptionId);

      let notificationIds: string[] = [];
      let escalatedToUserId: string | null = null;

      if (before.ownerUserId) {
        const ownerRole = await tx.userCampaignRole.findFirst({
          where: { userId: before.ownerUserId, campaignId: tenant.campaignId, status: 'ACTIVE' },
          include: { reportingManager: { include: { user: { select: { id: true, fullName: true } } } } },
        });
        if (ownerRole?.reportingManager) {
          await tx.escalation.create({
            data: {
              exceptionId,
              fromRoleId: ownerRole.roleId,
              toRoleId: ownerRole.reportingManager.roleId,
              level: before.escalationLevel + 1,
            },
          });
          escalatedToUserId = ownerRole.reportingManager.userId;
          notificationIds = await this.notifications.queue(tx, {
            userId: escalatedToUserId,
            title: 'An exception has been escalated to you',
            body: `${before.category} (level ${before.escalationLevel + 1}): ${before.remarks ?? 'See the exception detail for evidence.'}`,
            relatedEntityType: 'Exception',
            relatedEntityId: exceptionId,
          });
        }
      }

      const after = await tx.exception.update({ where: { id: exceptionId }, data: { escalationLevel: { increment: 1 } } });
      await this.recordAudit(tx, tenant, actorUserId, 'EXCEPTION_ESCALATED', exceptionId, before, { ...after, escalatedToUserId });
      return { after, notificationIds };
    });

    await this.notifications.dispatch(result.notificationIds);
    const [enriched] = await this.prisma.runInTenantContext(tenant.clientId, (tx) => this.enrichMany(tx, [result.after]));
    return enriched;
  }

  private async transition(
    tenant: TenantContext,
    exceptionId: string,
    actorUserId: string,
    to: ExceptionStatus,
    auditAction: string,
    data: Prisma.ExceptionUpdateInput,
  ) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const before = await this.findOrThrow(tx, tenant, exceptionId);
      this.assertTransition(before.status, to);
      const after = await tx.exception.update({ where: { id: exceptionId }, data: { status: to, ...data } });
      await this.recordAudit(tx, tenant, actorUserId, auditAction, exceptionId, before, after);
      const [enriched] = await this.enrichMany(tx, [after]);
      return enriched;
    });
  }

  private assertTransition(from: ExceptionStatus, to: ExceptionStatus) {
    if (!VALID_TRANSITIONS[from]?.includes(to)) {
      throw new BadRequestException(`Cannot move an exception from ${from} to ${to}`);
    }
  }

  private async recordAudit(
    tx: Prisma.TransactionClient,
    tenant: TenantContext,
    actorUserId: string,
    action: string,
    exceptionId: string,
    before: unknown,
    after: unknown,
  ) {
    await this.audit.record(tx, {
      clientId: tenant.clientId,
      campaignId: tenant.campaignId,
      actorUserId,
      action,
      entityType: 'Exception',
      entityId: exceptionId,
      before,
      after,
    });
  }

  private async findOrThrow(tx: Prisma.TransactionClient, tenant: TenantContext, exceptionId: string) {
    const exception = await tx.exception.findFirst({ where: { id: exceptionId, campaignId: tenant.campaignId } });
    if (!exception) throw new NotFoundException('Exception not found');
    return exception;
  }

  private async enrichMany(
    tx: Prisma.TransactionClient,
    exceptions: {
      id: string;
      category: string;
      severity: string;
      triggerType: string;
      activityInstanceId: string | null;
      userId: string | null;
      locationId: string | null;
      ownerUserId: string | null;
      escalationLevel: number;
      status: ExceptionStatus;
      evidenceJson: Prisma.JsonValue;
      remarks: string | null;
      resolution: string | null;
      resolvedAt: Date | null;
      closureApprovedByUserId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }[],
  ) {
    const userIds = [
      ...new Set(exceptions.flatMap((e) => [e.userId, e.ownerUserId, e.closureApprovedByUserId].filter((id): id is string => !!id))),
    ];
    const activityIds = [...new Set(exceptions.map((e) => e.activityInstanceId).filter((id): id is string => !!id))];
    const [users, activities] = await Promise.all([
      userIds.length ? tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } }) : Promise.resolve([]),
      activityIds.length
        ? tx.activityInstance.findMany({ where: { id: { in: activityIds } }, include: { pjpRow: { select: { locationName: true } } } })
        : Promise.resolve([]),
    ]);
    const nameById = new Map(users.map((u) => [u.id, u.fullName]));
    const activityById = new Map(activities.map((a) => [a.id, a]));

    return exceptions.map((e) => ({
      ...e,
      userFullName: e.userId ? (nameById.get(e.userId) ?? null) : null,
      ownerFullName: e.ownerUserId ? (nameById.get(e.ownerUserId) ?? null) : null,
      locationName: e.activityInstanceId ? (activityById.get(e.activityInstanceId)?.pjpRow?.locationName ?? null) : null,
    }));
  }
}
