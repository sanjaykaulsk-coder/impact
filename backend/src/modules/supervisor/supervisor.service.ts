import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalStatus, Prisma } from '@prisma/client';
import { MediaStorageService } from '../../core/storage/media-storage.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { DecideApprovalDto } from './dto/decide-approval.dto';

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
