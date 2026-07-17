import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { MediaStorageService } from '../../core/storage/media-storage.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { CHUNK_SIZE_BYTES } from './execution.constants';
import { GpsEventDto } from './dto/gps-event.dto';
import { InitMediaUploadDto } from './dto/init-media-upload.dto';
import { SubmitMilestoneDto } from './dto/submit-milestone.dto';
import { skuBindingOf } from '../forms/archetypes';
import { expectedClosingStock } from '../reports/formula';

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
    const [checkIn, checkOut, media, formResponse, approval] = await Promise.all([
      tx.checkIn.findFirst({ where: { activityInstanceId } }),
      tx.checkOut.findFirst({ where: { activityInstanceId } }),
      tx.media.findMany({ where: { activityInstanceId }, orderBy: { createdAt: 'asc' } }),
      tx.formResponse.findFirst({
        where: { activityInstanceId },
        include: { fieldResponses: true },
      }),
      // One Approval row per activity, reused across reject -> resubmit -> approve cycles (see
      // supervisor.service.ts) — this is the field app's view of the supervisor's decision.
      tx.approval.findFirst({ where: { entityType: 'ACTIVITY_INSTANCE', entityId: activityInstanceId } }),
    ]);
    return { activity, milestone, checkIn, checkOut, media, formResponse, approval };
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

  // --- Chunked, resumable media upload (docs/architecture/05's approved design) ---
  // A single-shot upload was tried first and broke on real devices: a multi-second transfer over
  // real Wi-Fi has a real chance of the connection dropping mid-transfer (network handover, a weak
  // signal), and a single-shot upload has no way to recover except discarding everything and
  // starting over. This three-step flow (init -> chunks -> complete) means a dropped connection
  // only costs the chunks not yet confirmed — /init is idempotent on content hash, so resuming
  // finds the same session and the client only re-sends what the server doesn't already have.

  /** Starts or resumes a chunked upload for one photo, keyed by its content hash. */
  async initMediaUpload(tenant: TenantContext, activityInstanceId: string, userId: string, dto: InitMediaUploadDto) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const activity = await tx.activityInstance.findUniqueOrThrow({ where: { id: activityInstanceId } });
      this.assertOwnership(activity, userId);

      // Already stored under this exact content hash — e.g. the client's own earlier /complete
      // call succeeded but it never saw the response. Hand back the existing Media rather than
      // starting a pointless new session for bytes the server already has.
      const existingMedia = await tx.media.findFirst({ where: { activityInstanceId, sha256Hash: dto.sha256Hash } });
      if (existingMedia) return { alreadyComplete: true as const, media: existingMedia };

      const existingSession = await tx.mediaUploadSession.findUnique({
        where: {
          activityInstanceId_uploadedByUserId_sha256Hash: {
            activityInstanceId,
            uploadedByUserId: userId,
            sha256Hash: dto.sha256Hash,
          },
        },
      });
      if (existingSession?.status === 'UPLOADING') {
        return { alreadyComplete: false as const, session: existingSession };
      }
      if (existingSession) {
        // Stale (completed-under-a-race or abandoned-after-a-corrupt-assembly) state for this
        // exact content hash — start clean rather than resume something unresumable.
        await this.media.discardChunks(existingSession.id);
        await tx.mediaUploadSession.delete({ where: { id: existingSession.id } });
      }

      const session = await tx.mediaUploadSession.create({
        data: {
          clientId: tenant.clientId,
          campaignId: tenant.campaignId,
          activityInstanceId,
          uploadedByUserId: userId,
          deviceId: dto.deviceId,
          sha256Hash: dto.sha256Hash,
          sizeBytes: dto.sizeBytes,
          mimeType: dto.mimeType,
          chunkSize: CHUNK_SIZE_BYTES,
          totalChunks: Math.ceil(dto.sizeBytes / CHUNK_SIZE_BYTES),
          latitude: dto.latitude,
          longitude: dto.longitude,
          capturedAt: new Date(dto.capturedAt),
        },
      });
      return { alreadyComplete: false as const, session };
    });
  }

  /** Accepts one chunk. Chunks may arrive in any order and be re-sent safely (writing the same
   * index twice just overwrites the same staged file with identical bytes). */
  async uploadMediaChunk(
    tenant: TenantContext,
    activityInstanceId: string,
    userId: string,
    sessionId: string,
    index: number,
    chunk: Buffer,
  ) {
    const session = await this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const activity = await tx.activityInstance.findUniqueOrThrow({ where: { id: activityInstanceId } });
      this.assertOwnership(activity, userId);
      const session = await tx.mediaUploadSession.findUniqueOrThrow({ where: { id: sessionId } });
      if (session.activityInstanceId !== activityInstanceId || session.uploadedByUserId !== userId) {
        throw new ForbiddenException('This upload session does not belong to you');
      }
      if (session.status !== 'UPLOADING') {
        throw new BadRequestException('This upload session is no longer accepting chunks');
      }
      if (index < 0 || index >= session.totalChunks) {
        throw new BadRequestException(`Chunk index out of range (expected 0-${session.totalChunks - 1})`);
      }
      return session;
    });

    // Disk I/O, deliberately outside the transaction above — same discipline as the rest of this
    // module's media handling (see the transaction-split note this replaced).
    await this.media.writeChunk(sessionId, index, chunk);

    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const receivedChunks = Array.from(new Set([...session.receivedChunks, index])).sort((a, b) => a - b);
      const updated = await tx.mediaUploadSession.update({ where: { id: sessionId }, data: { receivedChunks } });
      return { receivedChunks: updated.receivedChunks, totalChunks: updated.totalChunks };
    });
  }

  /** Assembles every received chunk, re-verifies the whole-file hash the client declared at
   * /init, then runs the existing watermark+storage pipeline exactly as the old single-shot
   * upload did. */
  async completeMediaUpload(tenant: TenantContext, activityInstanceId: string, userId: string, sessionId: string) {
    const prep = await this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const activity = await tx.activityInstance.findUniqueOrThrow({
        where: { id: activityInstanceId },
        include: { pjpRow: true },
      });
      this.assertOwnership(activity, userId);
      const session = await tx.mediaUploadSession.findUniqueOrThrow({ where: { id: sessionId } });
      if (session.activityInstanceId !== activityInstanceId || session.uploadedByUserId !== userId) {
        throw new ForbiddenException('This upload session does not belong to you');
      }
      if (session.status === 'COMPLETED' && session.resultMediaId) {
        // Already finished by an earlier call whose response the client never saw.
        const media = await tx.media.findUnique({ where: { id: session.resultMediaId } });
        if (media) return { done: true as const, media };
      }
      if (session.status !== 'UPLOADING') {
        throw new BadRequestException('This upload session cannot be completed');
      }
      const received = new Set(session.receivedChunks);
      const missing: number[] = [];
      for (let i = 0; i < session.totalChunks; i++) if (!received.has(i)) missing.push(i);
      if (missing.length > 0) throw new BadRequestException(`Missing chunk(s): ${missing.join(', ')}`);

      const uploader = await tx.user.findUnique({ where: { id: userId }, select: { fullName: true } });
      return {
        done: false as const,
        session,
        locationName: activity.pjpRow?.locationName ?? 'Field location',
        uploaderFullName: uploader?.fullName ?? 'Field user',
      };
    });
    if (prep.done) return prep.media;
    const { session, locationName, uploaderFullName } = prep;

    const assembled = await this.media.assembleChunks(session.id, session.totalChunks);
    const actualHash = createHash('sha256').update(assembled).digest('hex');
    if (actualHash !== session.sha256Hash) {
      // Corrupt/truncated transfer — never store it. Abandon this session so a later /init call
      // for the same content hash starts clean instead of retrying against permanently-broken
      // staged chunks.
      await this.media.discardChunks(session.id);
      await this.prisma.runInTenantContext(tenant.clientId, (tx) =>
        tx.mediaUploadSession.update({ where: { id: session.id }, data: { status: 'ABANDONED' } }),
      );
      throw new BadRequestException('Uploaded content does not match its checksum — please retake the photo');
    }

    const stored = await this.media.uploadEvidencePhoto({
      buffer: assembled,
      mimeType: session.mimeType,
      clientId: tenant.clientId,
      campaignId: tenant.campaignId,
      watermark: {
        locationName,
        capturedAt: session.capturedAt,
        latitude: Number(session.latitude),
        longitude: Number(session.longitude),
        userFullName: uploaderFullName,
      },
    });
    await this.media.discardChunks(session.id);

    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      // Duplicate-photo detection (spec §17): the exact same bytes already uploaded for this
      // activity is returned as-is rather than stored (and billed for storage) twice.
      const existing = await tx.media.findFirst({
        where: { activityInstanceId: session.activityInstanceId, sha256Hash: stored.sha256Hash },
      });
      const mediaRow =
        existing ??
        (await tx.media.create({
          data: {
            clientId: tenant.clientId,
            campaignId: tenant.campaignId,
            activityInstanceId: session.activityInstanceId,
            uploadedByUserId: session.uploadedByUserId,
            deviceId: session.deviceId,
            objectKeyOriginal: stored.objectKeyOriginal,
            objectKeyWatermarked: stored.objectKeyWatermarked,
            mimeType: session.mimeType,
            sizeBytes: stored.sizeBytes,
            sha256Hash: stored.sha256Hash,
            latitude: session.latitude,
            longitude: session.longitude,
            capturedAt: session.capturedAt,
            variant: 'ORIGINAL',
            validationStatus: 'PENDING',
            approvalStatus: 'PENDING',
            uploadStatus: 'SYNCED',
          },
        }));

      await tx.mediaUploadSession.update({
        where: { id: session.id },
        data: { status: 'COMPLETED', resultMediaId: mediaRow.id },
      });
      return mediaRow;
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

      await this.extractSkuMovements(tx, tenant, bundle, formResponse);

      return formResponse;
    });
  }

  /**
   * Normalizes SKU-bound answers into SkuMovement rows (report-format-library §2/§3): each
   * FieldResponse whose question carries a skuBinding in controlsJson becomes one movement row.
   * Zero quantities are written too — a visit that sold nothing still counts as a visited outlet
   * in the DFR rollup's record count. If this submission reports actual closing stock, the spec
   * §22 reconciliation runs immediately and a mismatch raises an Exception record.
   */
  private async extractSkuMovements(
    tx: Prisma.TransactionClient,
    tenant: TenantContext,
    bundle: Awaited<ReturnType<ExecutionService['loadBundle']>>,
    formResponse: { id: string; submittedAt: Date | null; fieldResponses: { id: string; formQuestionId: string; valueJson: Prisma.JsonValue }[] },
  ) {
    const questionsById = new Map(
      (bundle.milestone?.formVersion?.sections.flatMap((s) => s.questions) ?? []).map((q) => [q.id, q]),
    );

    // Visit date: the planned PJP date when there is one, else the submission date — the same rule
    // the DFR rollup groups by, so "one row per team/location/day" stays consistent.
    const movementDate = bundle.activity.pjpRow?.date ?? formResponse.submittedAt ?? new Date();
    const closingStockSkuIds = new Set<string>();

    for (const fieldResponse of formResponse.fieldResponses) {
      const question = questionsById.get(fieldResponse.formQuestionId);
      if (!question) continue;
      const binding = skuBindingOf(question.controlsJson);
      if (!binding) continue;

      const raw = fieldResponse.valueJson;
      const value = typeof raw === 'number' ? raw : Number(raw);
      if (Number.isNaN(value)) continue;

      await tx.skuMovement.create({
        data: {
          clientId: tenant.clientId,
          campaignId: tenant.campaignId,
          campaignSkuId: binding.campaignSkuId,
          formResponseId: formResponse.id,
          fieldResponseId: fieldResponse.id,
          locationId: bundle.activity.locationId,
          movementType: binding.movementType,
          movementDate,
          quantity: binding.metric === 'QUANTITY' ? value : 0,
          amount: binding.metric === 'AMOUNT' ? value : null,
        },
      });
      if (binding.movementType === 'CLOSING_STOCK_ACTUAL') closingStockSkuIds.add(binding.campaignSkuId);
    }

    // Reconcile at the moment actual closing stock is reported (spec §22): Opening + Received −
    // Sold − Sampled − Damaged = Expected Closing; any difference from the physical count becomes
    // an Exception record for the supervisor queue (full exception lifecycle is Stage 5.2).
    for (const campaignSkuId of closingStockSkuIds) {
      const sums = await tx.skuMovement.groupBy({
        by: ['movementType'],
        where: { campaignId: tenant.campaignId, campaignSkuId },
        _sum: { quantity: true },
      });
      const totals = Object.fromEntries(sums.map((s) => [s.movementType, Number(s._sum.quantity ?? 0)]));
      const expected = expectedClosingStock({
        opening: totals.OPENING_STOCK ?? 0,
        received: totals.RECEIVED ?? 0,
        sold: totals.SOLD ?? 0,
        sampled: totals.SAMPLED ?? 0,
        damaged: totals.DAMAGED ?? 0,
      });
      const actual = totals.CLOSING_STOCK_ACTUAL ?? 0;
      if (actual !== expected) {
        await tx.exception.create({
          data: {
            campaignId: tenant.campaignId,
            category: 'STOCK_MISMATCH',
            severity: 'HIGH',
            triggerType: 'STOCK_RECONCILIATION',
            activityInstanceId: bundle.activity.id,
            userId: bundle.activity.assignedUserId,
            locationId: bundle.activity.locationId,
            evidenceJson: {
              campaignSkuId,
              expectedClosing: expected,
              actualClosing: actual,
              difference: actual - expected,
              formResponseId: formResponse.id,
            },
            remarks: `Stock mismatch: expected ${expected}, counted ${actual}`,
          },
        });
      }
    }
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

      // Enters the supervisor review queue (docs/FIELD_COMMAND_SPEC.md §25/§44 scenario 5) — one
      // Approval row per activity, created here on first check-out.
      await tx.approval.create({
        data: {
          clientId: tenant.clientId,
          campaignId: tenant.campaignId,
          entityType: 'ACTIVITY_INSTANCE',
          entityId: activityInstanceId,
          requestedByUserId: userId,
          status: 'PENDING',
        },
      });

      return { checkOut, alreadyCheckedOut: false };
    });
  }

  /** Called after a rejected activity's flagged content has been redone (a new photo, an edited
   * form) — puts it back in the supervisor's queue without requiring a fresh physical check-out,
   * since the field worker's presence at the location was never in question, only the content a
   * supervisor flagged. */
  async resubmit(tenant: TenantContext, activityInstanceId: string, userId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const activity = await tx.activityInstance.findUniqueOrThrow({ where: { id: activityInstanceId } });
      this.assertOwnership(activity, userId);

      const approval = await tx.approval.findFirst({
        where: { entityType: 'ACTIVITY_INSTANCE', entityId: activityInstanceId },
      });
      if (!approval || approval.status !== 'REJECTED') {
        throw new BadRequestException('This activity has not been rejected — nothing to resubmit');
      }

      await tx.activityInstance.update({ where: { id: activityInstanceId }, data: { status: 'COMPLETED' } });
      return tx.approval.update({
        where: { id: approval.id },
        data: { status: 'PENDING', approverUserId: null, decidedAt: null },
      });
    });
  }
}
