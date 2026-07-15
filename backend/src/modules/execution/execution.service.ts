import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MediaStorageService } from '../../core/storage/media-storage.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { GpsEventDto } from './dto/gps-event.dto';
import { SubmitMilestoneDto } from './dto/submit-milestone.dto';
import { UploadMediaDto } from './dto/upload-media.dto';

/** Great-circle distance in metres — used to check a field worker's GPS position against the
 * planned location, same tolerance concept as CampaignBranding's deviationToleranceMeters. */
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MILESTONE_INCLUDE = {
  formVersion: {
    include: {
      sections: {
        orderBy: { order: 'asc' as const },
        include: { questions: { orderBy: { order: 'asc' as const }, include: { options: { orderBy: { order: 'asc' as const } } } } },
      },
      conditionalRules: true,
    },
  },
} satisfies Prisma.MilestoneInclude;

@Injectable()
export class ExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaStorageService,
  ) {}

  private assertOwnership(activity: { assignedUserId: string | null }, userId: string) {
    if (activity.assignedUserId !== userId) {
      throw new ForbiddenException('This activity is not assigned to you');
    }
  }

  private async loadBundle(tx: Prisma.TransactionClient, activityInstanceId: string) {
    const activity = await tx.activityInstance.findUniqueOrThrow({
      where: { id: activityInstanceId },
      include: { pjpRow: true, currentStage: { include: { milestones: { orderBy: { order: 'asc' }, include: MILESTONE_INCLUDE } } } },
    });
    const milestone = activity.currentStage?.milestones[0] ?? null;
    const [checkIn, checkOut, media, formResponse] = await Promise.all([
      tx.checkIn.findFirst({ where: { activityInstanceId } }),
      tx.checkOut.findFirst({ where: { activityInstanceId } }),
      tx.media.findMany({ where: { activityInstanceId }, orderBy: { createdAt: 'asc' } }),
      tx.formResponse.findFirst({
        where: { activityInstanceId },
        include: { fieldResponses: true },
      }),
    ]);
    return { activity, milestone, checkIn, checkOut, media, formResponse };
  }

  /** Finds (or, on first open, creates) the ActivityInstance behind a given assignment. A field
   * worker only ever sees the one seeded workflow/milestone per campaign in this build — see
   * seed.ts's Stage 2 Session B note; a real workflow picker is Stage 3.2. */
  async getOrCreateActivityForAssignment(tenant: TenantContext, assignmentId: string, userId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const assignment = await tx.userAssignment.findFirst({
        where: { id: assignmentId, campaignId: tenant.campaignId },
      });
      if (!assignment) throw new NotFoundException('Assignment not found');
      if (assignment.userId !== userId) throw new ForbiddenException('This assignment is not yours');
      if (!assignment.pjpRowId) throw new BadRequestException('This assignment has no location to visit yet');

      const campaignActivity = await tx.campaignActivity.findFirst({ where: { campaignId: tenant.campaignId } });
      if (!campaignActivity) {
        throw new BadRequestException('No field activity is configured for this campaign yet');
      }
      const workflow = await tx.workflow.findFirst({
        where: { campaignId: tenant.campaignId },
        include: { stages: { orderBy: { order: 'asc' } } },
      });
      const firstStage = workflow?.stages[0] ?? null;

      let activity = await tx.activityInstance.findFirst({
        where: { campaignId: tenant.campaignId, pjpRowId: assignment.pjpRowId, assignedUserId: userId },
      });
      if (!activity) {
        activity = await tx.activityInstance.create({
          data: {
            campaignActivityId: campaignActivity.id,
            campaignId: tenant.campaignId,
            clientId: tenant.clientId,
            locationId: (await tx.pJPRow.findUnique({ where: { id: assignment.pjpRowId } }))?.locationId,
            pjpRowId: assignment.pjpRowId,
            teamId: assignment.teamId,
            assignedUserId: userId,
            workflowId: workflow?.id,
            currentStageId: firstStage?.id,
            status: 'PLANNED',
            plannedDate: assignment.assignmentDate,
          },
        });
      }

      return this.loadBundle(tx, activity.id);
    });
  }

  async getActivity(tenant: TenantContext, activityInstanceId: string, userId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const bundle = await this.loadBundle(tx, activityInstanceId);
      this.assertOwnership(bundle.activity, userId);
      return bundle;
    });
  }

  async checkIn(tenant: TenantContext, activityInstanceId: string, userId: string, dto: GpsEventDto) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const activity = await tx.activityInstance.findUniqueOrThrow({
        where: { id: activityInstanceId },
        include: { pjpRow: true, location: true },
      });
      this.assertOwnership(activity, userId);

      const existing = await tx.checkIn.findFirst({ where: { activityInstanceId } });
      if (existing) return { checkIn: existing, alreadyCheckedIn: true };

      const plannedLat = activity.pjpRow?.latitude ?? activity.location?.latitude;
      const plannedLng = activity.pjpRow?.longitude ?? activity.location?.longitude;
      const distanceFromPlannedMeters =
        plannedLat != null && plannedLng != null
          ? haversineMeters(dto.latitude, dto.longitude, Number(plannedLat), Number(plannedLng))
          : null;

      const checkIn = await tx.checkIn.create({
        data: {
          activityInstanceId,
          userId,
          latitude: dto.latitude,
          longitude: dto.longitude,
          accuracyMeters: dto.accuracyMeters,
          deviceTimestamp: new Date(dto.deviceTimestamp),
          distanceFromPlannedMeters: distanceFromPlannedMeters !== null ? Math.round(distanceFromPlannedMeters) : null,
        },
      });

      if (activity.status === 'PLANNED') {
        await tx.activityInstance.update({
          where: { id: activityInstanceId },
          data: { status: 'IN_PROGRESS', actualStartAt: new Date() },
        });
      }

      const campaign = await tx.campaign.findUniqueOrThrow({ where: { id: tenant.campaignId } });
      return {
        checkIn,
        alreadyCheckedIn: false,
        toleranceMeters: campaign.deviationToleranceMeters,
        withinTolerance: distanceFromPlannedMeters === null || distanceFromPlannedMeters <= campaign.deviationToleranceMeters,
      };
    });
  }

  async uploadMedia(
    tenant: TenantContext,
    activityInstanceId: string,
    userId: string,
    file: Express.Multer.File,
    dto: UploadMediaDto,
  ) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const activity = await tx.activityInstance.findUniqueOrThrow({
        where: { id: activityInstanceId },
        include: { pjpRow: true },
      });
      this.assertOwnership(activity, userId);

      const uploader = await tx.user.findUnique({ where: { id: userId }, select: { fullName: true } });

      const stored = await this.media.uploadEvidencePhoto({
        buffer: file.buffer,
        mimeType: file.mimetype,
        clientId: tenant.clientId,
        campaignId: tenant.campaignId,
        watermark: {
          locationName: activity.pjpRow?.locationName ?? 'Field location',
          capturedAt: new Date(dto.capturedAt),
          latitude: dto.latitude,
          longitude: dto.longitude,
          userFullName: uploader?.fullName ?? 'Field user',
        },
      });

      // Duplicate-photo detection (spec §17): the exact same bytes already uploaded for this
      // activity is returned as-is rather than stored (and billed for storage) twice.
      const existing = await tx.media.findFirst({
        where: { activityInstanceId, sha256Hash: stored.sha256Hash },
      });
      if (existing) return existing;

      return tx.media.create({
        data: {
          clientId: tenant.clientId,
          campaignId: tenant.campaignId,
          activityInstanceId,
          uploadedByUserId: userId,
          deviceId: dto.deviceId,
          objectKeyOriginal: stored.objectKeyOriginal,
          objectKeyWatermarked: stored.objectKeyWatermarked,
          mimeType: file.mimetype,
          sizeBytes: stored.sizeBytes,
          sha256Hash: stored.sha256Hash,
          latitude: dto.latitude,
          longitude: dto.longitude,
          capturedAt: new Date(dto.capturedAt),
          variant: 'ORIGINAL',
          validationStatus: 'PENDING',
          approvalStatus: 'PENDING',
          uploadStatus: 'SYNCED',
        },
      });
    });
  }

  async submitMilestoneResponse(tenant: TenantContext, activityInstanceId: string, userId: string, dto: SubmitMilestoneDto) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const bundle = await this.loadBundle(tx, activityInstanceId);
      this.assertOwnership(bundle.activity, userId);
      if (!bundle.milestone?.formVersionId) {
        throw new BadRequestException('This activity has no form to submit');
      }

      // Idempotent by (deviceId, clientRef): a retried offline submission returns the original
      // response rather than creating a duplicate (spec's "conflict rules").
      if (dto.deviceId) {
        const existing = await tx.formResponse.findUnique({
          where: { deviceId_clientRef: { deviceId: dto.deviceId, clientRef: dto.clientRef } },
        });
        if (existing) return tx.formResponse.findUniqueOrThrow({ where: { id: existing.id }, include: { fieldResponses: true } });
      }

      const questionIds = new Set(
        bundle.milestone.formVersion?.sections.flatMap((s) => s.questions.map((q) => q.id)) ?? [],
      );
      for (const fr of dto.fieldResponses) {
        if (!questionIds.has(fr.formQuestionId)) {
          throw new BadRequestException(`Question ${fr.formQuestionId} does not belong to this milestone's form`);
        }
      }

      const mandatoryIds = (bundle.milestone.formVersion?.sections.flatMap((s) => s.questions) ?? [])
        .filter((q) => q.isMandatory)
        .map((q) => q.id);
      const answeredIds = new Set(dto.fieldResponses.map((fr) => fr.formQuestionId));
      const missing = mandatoryIds.filter((id) => !answeredIds.has(id));
      if (missing.length > 0) {
        throw new BadRequestException(`Missing ${missing.length} mandatory field(s)`);
      }

      const formResponse = await tx.formResponse.create({
        data: {
          formVersionId: bundle.milestone.formVersionId,
          activityInstanceId,
          campaignId: tenant.campaignId,
          clientId: tenant.clientId,
          submittedByUserId: userId,
          deviceId: dto.deviceId,
          clientRef: dto.clientRef,
          status: 'SYNCED',
          submittedAt: new Date(),
          syncedAt: new Date(),
          fieldResponses: {
            create: dto.fieldResponses.map((fr) => ({
              formQuestionId: fr.formQuestionId,
              valueJson: fr.valueJson as Prisma.InputJsonValue,
            })),
          },
        },
        include: { fieldResponses: true },
      });

      return formResponse;
    });
  }

  async checkOut(tenant: TenantContext, activityInstanceId: string, userId: string, dto: GpsEventDto) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const bundle = await this.loadBundle(tx, activityInstanceId);
      this.assertOwnership(bundle.activity, userId);

      if (!bundle.checkIn) throw new BadRequestException('Check in before checking out');
      const requiredPhotos = bundle.milestone?.mandatoryPhotoCount ?? 0;
      if (bundle.media.length < requiredPhotos) {
        throw new BadRequestException(`This milestone needs at least ${requiredPhotos} photo(s) — ${bundle.media.length} uploaded so far`);
      }
      if (bundle.milestone?.mandatoryGps && !bundle.checkIn) {
        throw new BadRequestException('GPS check-in is required before completing this activity');
      }
      if (bundle.milestone?.formVersionId && !bundle.formResponse) {
        throw new BadRequestException('The milestone form must be submitted before checking out');
      }

      const existing = await tx.checkOut.findFirst({ where: { activityInstanceId } });
      if (existing) return { checkOut: existing, alreadyCheckedOut: true };

      const checkOut = await tx.checkOut.create({
        data: {
          activityInstanceId,
          userId,
          latitude: dto.latitude,
          longitude: dto.longitude,
          deviceTimestamp: new Date(dto.deviceTimestamp),
        },
      });
      await tx.activityInstance.update({
        where: { id: activityInstanceId },
        data: { status: 'COMPLETED', actualEndAt: new Date() },
      });

      return { checkOut, alreadyCheckedOut: false };
    });
  }
}
