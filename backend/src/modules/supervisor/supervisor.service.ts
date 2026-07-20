import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../core/audit/audit.service';
import { MediaStorageService } from '../../core/storage/media-storage.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { DEVICE_RISK_SIGNAL_TYPES } from '../device-risk/device-risk.constants';
import { DecideApprovalDto } from './dto/decide-approval.dto';
import { DecideDeviationRequestDto } from './dto/decide-deviation-request.dto';

const ACTIVITY_INCLUDE = {
  pjpRow: true,
  checkIns: true,
  checkOuts: true,
  media: { orderBy: { createdAt: 'asc' as const } },
  formResponses: {
    include: { fieldResponses: { include: { formQuestion: true } } },
    orderBy: { submittedAt: 'desc' as const },
    take: 1,
  },
} satisfies Prisma.ActivityInstanceInclude;

/**
 * Spec §25/§44 scenario 5: "views team progress -> reviews media and GPS -> approves/rejects with
 * remarks." Scoped to exactly that for this session (Session C) — not the full supervisor module
 * (team dashboard, live map, exceptions, WhatsApp verification are all later-stage work per
 * docs/architecture/09's S4/S5, deliberately not touched here).
 */
@Injectable()
export class SupervisorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaStorageService,
    private readonly audit: AuditService,
  ) {}

  async inbox(tenant: TenantContext, status: ApprovalStatus) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const approvals = await tx.approval.findMany({
        where: { campaignId: tenant.campaignId, entityType: 'ACTIVITY_INSTANCE', status },
        orderBy: { createdAt: 'asc' },
      });
      return Promise.all(approvals.map((a) => this.enrich(tx, a)));
    });
  }

  async detail(tenant: TenantContext, approvalId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const approval = await this.findScopedApproval(tx, tenant, approvalId);
      return this.enrich(tx, approval);
    });
  }

  async decide(tenant: TenantContext, approvalId: string, approverUserId: string, dto: DecideApprovalDto) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const approval = await this.findScopedApproval(tx, tenant, approvalId);
      if (approval.status !== 'PENDING') {
        throw new BadRequestException('This activity has already been decided — refresh the inbox');
      }
      if (dto.decision === 'REJECTED' && !dto.remarks?.trim()) {
        throw new BadRequestException('Remarks are required when rejecting, so the field worker knows what to correct');
      }

      const updated = await tx.approval.update({
        where: { id: approvalId },
        data: {
          status: dto.decision,
          remarks: dto.remarks ?? approval.remarks,
          decidedAt: new Date(),
          approverUserId,
        },
      });

      if (dto.decision === 'REJECTED') {
        // Reopens the activity on the field side (see ExecutionService.resubmit) — not a blocking
        // gate, just a signal the field app surfaces so the worker knows to fix and resend.
        await tx.activityInstance.update({ where: { id: approval.entityId }, data: { status: 'IN_PROGRESS' } });
      }

      return updated;
    });
  }

  /**
   * Spec §14's deviation workflow, supervisor side: "Activity Supervisor alerted → approve/reject
   * → decision stored in audit history." The activity itself is never gated by this — approve or
   * reject, the field worker's already-continuing activity is unaffected; this is purely the
   * record of whether the explanation was accepted.
   */
  async deviationInbox(tenant: TenantContext, status: ApprovalStatus) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const requests = await tx.deviationRequest.findMany({
        where: { campaignId: tenant.campaignId, status },
        orderBy: { createdAt: 'asc' },
      });
      return this.enrichDeviations(tx, requests);
    });
  }

  async decideDeviation(tenant: TenantContext, deviationRequestId: string, approverUserId: string, dto: DecideDeviationRequestDto) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const request = await this.findScopedDeviation(tx, tenant, deviationRequestId);
      if (request.status !== 'PENDING') {
        throw new BadRequestException('This deviation request has already been decided');
      }

      const updated = await tx.deviationRequest.update({
        where: { id: deviationRequestId },
        data: { status: dto.decision, remarks: dto.remarks ?? request.remarks, decidedByUserId: approverUserId, decidedAt: new Date() },
      });

      await this.audit.record(tx, {
        clientId: tenant.clientId,
        campaignId: tenant.campaignId,
        actorUserId: approverUserId,
        action: dto.decision === 'APPROVED' ? 'DEVIATION_REQUEST_APPROVED' : 'DEVIATION_REQUEST_REJECTED',
        entityType: 'DeviationRequest',
        entityId: deviationRequestId,
        before: request,
        after: updated,
      });

      return updated;
    });
  }

  /**
   * Manual escalation only (spec §29's ladder is Activity Supervisor → Activity Spoke → Regional
   * Operations → Operations Director on a 0/15/30/60-minute timer) — there's no delayed-job queue
   * in this codebase yet to promote a stale deviation request automatically, so a supervisor bumps
   * the level themselves when a request has sat too long. See docs/ASSUMPTIONS.md A-059.
   */
  async escalateDeviation(tenant: TenantContext, deviationRequestId: string, actorUserId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const request = await this.findScopedDeviation(tx, tenant, deviationRequestId);
      if (request.status !== 'PENDING') {
        throw new BadRequestException('Only a pending deviation request can be escalated');
      }

      const updated = await tx.deviationRequest.update({
        where: { id: deviationRequestId },
        data: { escalationLevel: { increment: 1 } },
      });

      await this.audit.record(tx, {
        clientId: tenant.clientId,
        campaignId: tenant.campaignId,
        actorUserId,
        action: 'DEVIATION_REQUEST_ESCALATED',
        entityType: 'DeviationRequest',
        entityId: deviationRequestId,
        before: { escalationLevel: request.escalationLevel },
        after: { escalationLevel: updated.escalationLevel },
      });

      return updated;
    });
  }

  /**
   * Devices with an OPEN device-risk alert in this campaign (spec §18's "supervisor review
   * queue"). Device itself is platform-scoped (no clientId — same posture as Role), but the
   * Alerts DeviceRiskService writes are campaign-scoped, so the queue is naturally per-campaign
   * even though the underlying Device row isn't.
   */
  async deviceRiskInbox(tenant: TenantContext) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const alerts = await tx.alert.findMany({
        where: { campaignId: tenant.campaignId, status: 'OPEN', issueType: { in: DEVICE_RISK_SIGNAL_TYPES } },
        orderBy: { createdAt: 'desc' },
      });
      if (alerts.length === 0) return [];

      const deviceIds = [
        ...new Set(alerts.map((a) => (a.evidenceJson as { deviceId?: string } | null)?.deviceId).filter((id): id is string => !!id)),
      ];
      const [devices, users] = await Promise.all([
        tx.device.findMany({ where: { id: { in: deviceIds } } }),
        tx.user.findMany({ where: { id: { in: alerts.map((a) => a.userId).filter((id): id is string => !!id) } }, select: { id: true, fullName: true } }),
      ]);
      const deviceById = new Map(devices.map((d) => [d.id, d]));
      const nameById = new Map(users.map((u) => [u.id, u.fullName]));

      return alerts.map((a) => {
        const deviceId = (a.evidenceJson as { deviceId?: string } | null)?.deviceId ?? null;
        const device = deviceId ? deviceById.get(deviceId) : undefined;
        return {
          alertId: a.id,
          deviceId,
          deviceModel: device?.deviceModel ?? null,
          osVersion: device?.osVersion ?? null,
          riskLevel: device?.riskLevel ?? null,
          userFullName: a.userId ? (nameById.get(a.userId) ?? 'Unknown') : 'Unknown',
          issueType: a.issueType,
          severity: a.severity,
          evidenceJson: a.evidenceJson,
          createdAt: a.createdAt,
        };
      });
    });
  }

  /** Resets a device back to L1 and resolves its open device-risk alerts — a supervisor's
   * judgement call that whatever was flagged is explained/acceptable. */
  async clearDeviceRisk(tenant: TenantContext, deviceId: string, actorUserId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const device = await tx.device.findUnique({ where: { id: deviceId } });
      if (!device) throw new NotFoundException('Device not found');

      await tx.device.update({ where: { id: deviceId }, data: { riskLevel: 'L1_WARNING', status: device.status === 'BLOCKED' ? 'ACTIVE' : device.status } });
      await tx.alert.updateMany({
        where: { campaignId: tenant.campaignId, status: 'OPEN', issueType: { in: DEVICE_RISK_SIGNAL_TYPES } },
        data: { status: 'RESOLVED' },
      });

      await this.audit.record(tx, {
        clientId: tenant.clientId,
        campaignId: tenant.campaignId,
        actorUserId,
        action: 'DEVICE_RISK_CLEARED',
        entityType: 'Device',
        entityId: deviceId,
        before: { riskLevel: device.riskLevel, status: device.status },
        after: { riskLevel: 'L1_WARNING', status: 'ACTIVE' },
      });
    });
  }

  /** Explicit, deliberate exclusion (spec §18: "L4 Blocked — user/device barred") — kept separate
   * from the automatic signal system, which this session deliberately caps at L3 (see
   * docs/ASSUMPTIONS.md), so a device is only ever fully barred by a human decision. */
  async blockDevice(tenant: TenantContext, deviceId: string, actorUserId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const device = await tx.device.findUnique({ where: { id: deviceId } });
      if (!device) throw new NotFoundException('Device not found');

      await tx.device.update({ where: { id: deviceId }, data: { riskLevel: 'L4_BLOCKED', status: 'BLOCKED' } });

      await this.audit.record(tx, {
        clientId: tenant.clientId,
        campaignId: tenant.campaignId,
        actorUserId,
        action: 'DEVICE_BLOCKED',
        entityType: 'Device',
        entityId: deviceId,
        before: { riskLevel: device.riskLevel, status: device.status },
        after: { riskLevel: 'L4_BLOCKED', status: 'BLOCKED' },
      });
    });
  }

  private async findScopedDeviation(tx: Prisma.TransactionClient, tenant: TenantContext, deviationRequestId: string) {
    const request = await tx.deviationRequest.findUnique({ where: { id: deviationRequestId } });
    if (!request) throw new NotFoundException('Deviation request not found');
    if (request.campaignId !== tenant.campaignId) {
      throw new ForbiddenException('This deviation request belongs to a different campaign');
    }
    return request;
  }

  private async enrichDeviations(
    tx: Prisma.TransactionClient,
    requests: {
      id: string;
      activityInstanceId: string;
      userId: string;
      deviationType: string;
      distanceMeters: Prisma.Decimal | null;
      reason: string;
      remarks: string | null;
      status: ApprovalStatus;
      escalationLevel: number;
      decidedByUserId: string | null;
      decidedAt: Date | null;
      createdAt: Date;
    }[],
  ) {
    const userIds = [...new Set(requests.flatMap((r) => [r.userId, r.decidedByUserId].filter((id): id is string => !!id)))];
    const activityIds = [...new Set(requests.map((r) => r.activityInstanceId))];
    const [users, activities] = await Promise.all([
      tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } }),
      tx.activityInstance.findMany({
        where: { id: { in: activityIds } },
        include: { pjpRow: { select: { locationName: true } } },
      }),
    ]);
    const nameById = new Map(users.map((u) => [u.id, u.fullName]));
    const activityById = new Map(activities.map((a) => [a.id, a]));

    return requests.map((r) => ({
      id: r.id,
      activityInstanceId: r.activityInstanceId,
      locationName: activityById.get(r.activityInstanceId)?.pjpRow?.locationName ?? 'Field location',
      userFullName: nameById.get(r.userId) ?? 'Unknown',
      deviationType: r.deviationType,
      distanceMeters: r.distanceMeters,
      reason: r.reason,
      remarks: r.remarks,
      status: r.status,
      escalationLevel: r.escalationLevel,
      decidedByName: r.decidedByUserId ? (nameById.get(r.decidedByUserId) ?? null) : null,
      decidedAt: r.decidedAt,
      createdAt: r.createdAt,
    }));
  }

  private async findScopedApproval(tx: Prisma.TransactionClient, tenant: TenantContext, approvalId: string) {
    const approval = await tx.approval.findUnique({ where: { id: approvalId } });
    if (!approval) throw new NotFoundException('Approval not found');
    if (approval.campaignId !== tenant.campaignId) {
      throw new ForbiddenException('This approval belongs to a different campaign');
    }
    return approval;
  }

  private async enrich(tx: Prisma.TransactionClient, approval: { id: string; entityId: string; status: ApprovalStatus; remarks: string | null; decidedAt: Date | null; approverUserId: string | null; createdAt: Date }) {
    const activity = await tx.activityInstance.findUniqueOrThrow({
      where: { id: approval.entityId },
      include: ACTIVITY_INCLUDE,
    });
    const [assignedUser, approverUser] = await Promise.all([
      activity.assignedUserId
        ? tx.user.findUnique({ where: { id: activity.assignedUserId }, select: { fullName: true } })
        : null,
      approval.approverUserId
        ? tx.user.findUnique({ where: { id: approval.approverUserId }, select: { fullName: true } })
        : null,
    ]);

    const media = await Promise.all(
      activity.media.map(async (m) => ({
        id: m.id,
        // Supervisors review the WATERMARKED copy by default (spec §21) — the burned-in GPS/time/
        // location/user strip is the whole point of this review step. Original access is a
        // separate, distinct permission not wired up in this session.
        url: await this.media.getSignedGetUrl(m.objectKeyWatermarked ?? m.objectKeyOriginal),
        latitude: m.latitude,
        longitude: m.longitude,
        capturedAt: m.capturedAt,
      })),
    );

    const formResponse = activity.formResponses[0] ?? null;

    return {
      approvalId: approval.id,
      status: approval.status,
      remarks: approval.remarks,
      decidedAt: approval.decidedAt,
      decidedByName: approverUser?.fullName ?? null,
      createdAt: approval.createdAt,
      activity: {
        id: activity.id,
        status: activity.status,
        locationName: activity.pjpRow?.locationName ?? 'Field location',
        assignedUserName: assignedUser?.fullName ?? 'Unknown',
      },
      checkIn: activity.checkIns[0]
        ? {
            latitude: activity.checkIns[0].latitude,
            longitude: activity.checkIns[0].longitude,
            deviceTimestamp: activity.checkIns[0].deviceTimestamp,
            distanceFromPlannedMeters: activity.checkIns[0].distanceFromPlannedMeters,
          }
        : null,
      checkOut: activity.checkOuts[0]
        ? {
            latitude: activity.checkOuts[0].latitude,
            longitude: activity.checkOuts[0].longitude,
            deviceTimestamp: activity.checkOuts[0].deviceTimestamp,
          }
        : null,
      media,
      formResponses: formResponse
        ? formResponse.fieldResponses.map((fr) => ({
            questionLabel: fr.formQuestion.label,
            valueJson: fr.valueJson,
          }))
        : [],
    };
  }
}
