import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../core/audit/audit.service';
import { GeocodingService } from '../../core/geo/geocoding.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { CreatePjpDto, PjpRowInputDto } from './dto/create-pjp.dto';
import { CancelPjpRowDto, PostponePjpRowDto, ReassignPjpRowDto, ReschedulePjpRowDto } from './dto/pjp-row-actions.dto';
import { UpdatePjpRowDto } from './dto/update-pjp-row.dto';

interface RowValidationResult {
  rowIndex: number;
  reasons: string[];
}

const ROW_ENTITY_TYPE = 'PJPRow';

/** Statuses that mean field work on this row has genuinely started or finished. */
const LOCKED_INSTANCE_STATUSES = ['IN_PROGRESS', 'COMPLETED', 'CLOSED'] as const;

@Injectable()
export class PjpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly geocoding: GeocodingService,
  ) {}

  /**
   * Blocks edit/cancel/postpone/reschedule once field work has actually started or finished for
   * this row — rewriting a stop's date or dropping it after someone has already checked in makes
   * the field record inconsistent with what happened. Reassigning a supervisor is deliberately not
   * gated by this (a mid-day handover is a legitimate real-world need).
   */
  private async assertRowEditable(tx: Prisma.TransactionClient, rowId: string) {
    const lockedInstance = await tx.activityInstance.findFirst({
      where: { pjpRowId: rowId, status: { in: [...LOCKED_INSTANCE_STATUSES] } },
    });
    if (lockedInstance) {
      throw new BadRequestException(
        'This stop already has field activity in progress or completed — it can no longer be edited, cancelled, postponed, or rescheduled.',
      );
    }
  }

  private async findRowOrThrow(tx: Prisma.TransactionClient, tenant: TenantContext, pjpId: string, rowId: string) {
    const row = await tx.pJPRow.findFirst({ where: { id: rowId, pjpId, campaignId: tenant.campaignId } });
    if (!row) throw new NotFoundException('PJP row not found');
    return row;
  }

  async findAll(tenant: TenantContext) {
    return this.prisma.runInTenantContext(tenant.clientId, (tx) =>
      tx.pJP.findMany({ where: { campaignId: tenant.campaignId }, orderBy: { createdAt: 'desc' } }),
    );
  }

  /**
   * State/District/Tehsil/Location suggestions (founder request) — every distinct combination
   * already used somewhere in this campaign's PJP rows, most recent first, so typing a location
   * name that's been used before can auto-fill the rest (and its last-known coordinates) instead
   * of retyping — and so slightly different spellings of the same place don't quietly pile up.
   */
  async knownLocations(tenant: TenantContext) {
    return this.prisma.runInTenantContext(tenant.clientId, (tx) =>
      tx.pJPRow.findMany({
        where: { campaignId: tenant.campaignId },
        distinct: ['stateName', 'districtName', 'tehsilName', 'locationName'],
        orderBy: { date: 'desc' },
        select: { stateName: true, districtName: true, tehsilName: true, locationName: true, latitude: true, longitude: true },
        take: 500,
      }),
    );
  }

  /** "Suggest lat/long" (founder request) — a real OpenStreetMap geocode lookup, not a mock; see
   * GeocodingService for why this is safe to call directly from a manually-clicked button. */
  async geocode(parts: { locationName?: string; tehsilName?: string; districtName?: string; stateName?: string }) {
    return this.geocoding.geocode(parts);
  }

  async findOne(tenant: TenantContext, pjpId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const pjp = await tx.pJP.findFirst({
        where: { id: pjpId, campaignId: tenant.campaignId },
        include: { rows: { orderBy: { date: 'asc' } } },
      });
      if (!pjp) throw new NotFoundException('PJP not found');

      // PJPRow.supervisorUserId is a plain scalar FK (no Prisma relation, same pattern as
      // UserAssignment.userId) — names are resolved with a second query, same as AssignmentsService.
      const supervisorIds = [...new Set(pjp.rows.map((r) => r.supervisorUserId).filter((id): id is string => !!id))];
      const supervisors = supervisorIds.length
        ? await tx.user.findMany({ where: { id: { in: supervisorIds } }, select: { id: true, fullName: true } })
        : [];
      const nameById = new Map(supervisors.map((u) => [u.id, u.fullName]));
      return {
        ...pjp,
        rows: pjp.rows.map((r) => ({ ...r, supervisorName: r.supervisorUserId ? (nameById.get(r.supervisorUserId) ?? null) : null })),
      };
    });
  }

  /**
   * Row-level validation, run server-side regardless of what the browser already checked during
   * mapping/preview — the client's validation is a UX convenience, never the source of truth
   * (spec's general rule that trust boundaries are enforced at the API, not the UI).
   */
  private validateRow(row: PjpRowInputDto): string[] {
    const reasons: string[] = [];
    if (!row.date || Number.isNaN(Date.parse(row.date))) reasons.push('date is missing or unparseable');
    if (!row.stateName?.trim()) reasons.push('stateName is required');
    if (!row.districtName?.trim()) reasons.push('districtName is required');
    if (!row.tehsilName?.trim()) reasons.push('tehsilName is required');
    if (!row.locationName?.trim()) reasons.push('locationName is required');
    if (row.latitude !== undefined && (row.latitude < -90 || row.latitude > 90)) {
      reasons.push('latitude out of range (-90 to 90)');
    }
    if (row.longitude !== undefined && (row.longitude < -180 || row.longitude > 180)) {
      reasons.push('longitude out of range (-180 to 180)');
    }
    return reasons;
  }

  /**
   * Creates the PJP and only the rows that pass validation — invalid rows are reported back
   * (index + reasons) but never persisted, since PJPRow's status enum (ACTIVE/CANCELLED/
   * POSTPONED/RESCHEDULED) has no "invalid" state to hold them in.
   */
  async create(tenant: TenantContext, dto: CreatePjpDto, uploadedById: string) {
    const invalid: RowValidationResult[] = [];
    const valid: PjpRowInputDto[] = [];
    dto.rows.forEach((row, rowIndex) => {
      const reasons = this.validateRow(row);
      if (reasons.length > 0) invalid.push({ rowIndex, reasons });
      else valid.push(row);
    });

    if (valid.length === 0) {
      throw new BadRequestException('Every row failed validation — nothing to import');
    }

    const pjp = await this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const created = await tx.pJP.create({
        data: {
          clientId: tenant.clientId,
          campaignId: tenant.campaignId,
          fileName: dto.fileName,
          uploadedById,
          status: 'DRAFT',
          totalRows: dto.rows.length,
          invalidRows: invalid.length,
        },
      });
      await tx.pJPRow.createMany({
        data: valid.map((row) => ({
          pjpId: created.id,
          clientId: tenant.clientId,
          campaignId: tenant.campaignId,
          date: new Date(row.date!),
          stateName: row.stateName!.trim(),
          districtName: row.districtName!.trim(),
          tehsilName: row.tehsilName!.trim(),
          locationName: row.locationName!.trim(),
          latitude: row.latitude,
          longitude: row.longitude,
          contactPerson: row.contactPerson,
          remarks: row.remarks,
          status: 'ACTIVE',
        })),
      });
      return tx.pJP.findUniqueOrThrow({ where: { id: created.id }, include: { rows: { orderBy: { date: 'asc' } } } });
    });

    return { ...pjp, invalidRowDetails: invalid };
  }

  /**
   * A single, manually-typed location — for campaigns with no PJP file to upload yet, or to add
   * one more stop without redoing the whole CSV flow. Every manual entry accumulates into one
   * ongoing PJP per campaign (fileName sentinel below) rather than a CSV-upload's own DRAFT batch,
   * and is published immediately: unlike a bulk import, there's no separate preview/confirm step
   * to gate on, since the admin already confirmed this exact row by submitting the form. Published
   * immediately also means it's assignable right away (AssignmentsService.availableRows only reads
   * PJPRows whose PJP is PUBLISHED).
   */
  private static readonly MANUAL_ENTRIES_FILE_NAME = 'Manually added locations';

  async addManualLocation(tenant: TenantContext, row: PjpRowInputDto, uploadedById: string) {
    const reasons = this.validateRow(row);
    if (reasons.length > 0) {
      throw new BadRequestException(reasons.join('; '));
    }

    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      let pjp = await tx.pJP.findFirst({
        where: { campaignId: tenant.campaignId, fileName: PjpService.MANUAL_ENTRIES_FILE_NAME },
      });
      if (!pjp) {
        pjp = await tx.pJP.create({
          data: {
            clientId: tenant.clientId,
            campaignId: tenant.campaignId,
            fileName: PjpService.MANUAL_ENTRIES_FILE_NAME,
            uploadedById,
            status: 'PUBLISHED',
            totalRows: 0,
            invalidRows: 0,
            publishedAt: new Date(),
          },
        });
      }

      await tx.pJPRow.create({
        data: {
          pjpId: pjp.id,
          clientId: tenant.clientId,
          campaignId: tenant.campaignId,
          date: new Date(row.date!),
          stateName: row.stateName!.trim(),
          districtName: row.districtName!.trim(),
          tehsilName: row.tehsilName!.trim(),
          locationName: row.locationName!.trim(),
          latitude: row.latitude,
          longitude: row.longitude,
          contactPerson: row.contactPerson,
          remarks: row.remarks,
          status: 'ACTIVE',
        },
      });
      await tx.pJP.update({ where: { id: pjp.id }, data: { totalRows: { increment: 1 } } });

      return tx.pJP.findUniqueOrThrow({ where: { id: pjp.id }, include: { rows: { orderBy: { date: 'asc' } } } });
    });
  }

  async publish(tenant: TenantContext, pjpId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const pjp = await tx.pJP.findFirst({ where: { id: pjpId, campaignId: tenant.campaignId } });
      if (!pjp) throw new NotFoundException('PJP not found');
      if (pjp.status !== 'DRAFT') throw new BadRequestException(`Cannot publish a PJP in ${pjp.status} status`);
      return tx.pJP.update({ where: { id: pjpId }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
    });
  }

  /** Edits mutable, non-status fields — date-affecting actions go through postpone/reschedule instead. */
  async updateRow(tenant: TenantContext, pjpId: string, rowId: string, dto: UpdatePjpRowDto) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const before = await this.findRowOrThrow(tx, tenant, pjpId, rowId);
      await this.assertRowEditable(tx, rowId);

      const after = await tx.pJPRow.update({
        where: { id: rowId },
        data: {
          ...(dto.locationName !== undefined ? { locationName: dto.locationName } : {}),
          ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
          ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
          ...(dto.contactPerson !== undefined ? { contactPerson: dto.contactPerson } : {}),
          ...(dto.remarks !== undefined ? { remarks: dto.remarks } : {}),
          ...(dto.plannedSequence !== undefined ? { plannedSequence: dto.plannedSequence } : {}),
        },
      });

      await this.audit.record(tx, {
        clientId: tenant.clientId,
        campaignId: tenant.campaignId,
        actorUserId: tenant.userId,
        action: 'PJP_ROW_EDITED',
        entityType: ROW_ENTITY_TYPE,
        entityId: rowId,
        before,
        after: { ...after, reason: dto.reason },
      });
      return after;
    });
  }

  async cancelRow(tenant: TenantContext, pjpId: string, rowId: string, dto: CancelPjpRowDto) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const before = await this.findRowOrThrow(tx, tenant, pjpId, rowId);
      if (before.status === 'CANCELLED') throw new BadRequestException('This stop is already cancelled');
      await this.assertRowEditable(tx, rowId);

      const after = await tx.pJPRow.update({ where: { id: rowId }, data: { status: 'CANCELLED' } });

      await this.audit.record(tx, {
        clientId: tenant.clientId,
        campaignId: tenant.campaignId,
        actorUserId: tenant.userId,
        action: 'PJP_ROW_CANCELLED',
        entityType: ROW_ENTITY_TYPE,
        entityId: rowId,
        before,
        after: { ...after, reason: dto.reason },
      });
      return after;
    });
  }

  /** A short delay — same stop, same plan, pushed to a later date. See ReschedulePjpRowDto for the distinction. */
  async postponeRow(tenant: TenantContext, pjpId: string, rowId: string, dto: PostponePjpRowDto) {
    const newDate = new Date(dto.newDate);
    if (Number.isNaN(newDate.getTime())) throw new BadRequestException('newDate is not a valid date');

    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const before = await this.findRowOrThrow(tx, tenant, pjpId, rowId);
      await this.assertRowEditable(tx, rowId);

      const after = await tx.pJPRow.update({ where: { id: rowId }, data: { status: 'POSTPONED', date: newDate } });

      await this.audit.record(tx, {
        clientId: tenant.clientId,
        campaignId: tenant.campaignId,
        actorUserId: tenant.userId,
        action: 'PJP_ROW_POSTPONED',
        entityType: ROW_ENTITY_TYPE,
        entityId: rowId,
        before,
        after: { ...after, reason: dto.reason },
      });
      return after;
    });
  }

  /** A plan change — may move date and/or sequence as part of a wider route restructure. */
  async rescheduleRow(tenant: TenantContext, pjpId: string, rowId: string, dto: ReschedulePjpRowDto) {
    const newDate = new Date(dto.newDate);
    if (Number.isNaN(newDate.getTime())) throw new BadRequestException('newDate is not a valid date');

    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const before = await this.findRowOrThrow(tx, tenant, pjpId, rowId);
      await this.assertRowEditable(tx, rowId);

      const after = await tx.pJPRow.update({ where: { id: rowId }, data: { status: 'RESCHEDULED', date: newDate } });

      await this.audit.record(tx, {
        clientId: tenant.clientId,
        campaignId: tenant.campaignId,
        actorUserId: tenant.userId,
        action: 'PJP_ROW_RESCHEDULED',
        entityType: ROW_ENTITY_TYPE,
        entityId: rowId,
        before,
        after: { ...after, reason: dto.reason },
      });
      return after;
    });
  }

  /**
   * Reassigns the row's responsible supervisor. Team reassignment is deliberately out of scope —
   * there is no Team management module yet (no way to create one), so exposing a team picker here
   * would be a dead-end control; logged as a known gap (A-056), not silently dropped.
   */
  async reassignRow(tenant: TenantContext, pjpId: string, rowId: string, dto: ReassignPjpRowDto) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const before = await this.findRowOrThrow(tx, tenant, pjpId, rowId);

      const membership = await tx.userCampaignRole.findFirst({
        where: { userId: dto.supervisorUserId, campaignId: tenant.campaignId, status: 'ACTIVE' },
      });
      if (!membership) throw new BadRequestException('That user does not hold an active role in this campaign');

      const after = await tx.pJPRow.update({ where: { id: rowId }, data: { supervisorUserId: dto.supervisorUserId } });

      await this.audit.record(tx, {
        clientId: tenant.clientId,
        campaignId: tenant.campaignId,
        actorUserId: tenant.userId,
        action: 'PJP_ROW_REASSIGNED',
        entityType: ROW_ENTITY_TYPE,
        entityId: rowId,
        before,
        after: { ...after, reason: dto.reason },
      });
      return after;
    });
  }

  async rowHistory(tenant: TenantContext, pjpId: string, rowId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      await this.findRowOrThrow(tx, tenant, pjpId, rowId);
      const entries = await tx.auditLog.findMany({
        where: { campaignId: tenant.campaignId, entityType: ROW_ENTITY_TYPE, entityId: rowId },
        orderBy: { createdAt: 'desc' },
      });
      const actorIds = [...new Set(entries.map((e) => e.actorUserId).filter((id): id is string => !!id))];
      const actors = actorIds.length
        ? await tx.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, fullName: true } })
        : [];
      const nameById = new Map(actors.map((u) => [u.id, u.fullName]));
      return entries.map((e) => ({
        id: e.id,
        action: e.action,
        before: e.beforeJson,
        after: e.afterJson,
        actorUserId: e.actorUserId,
        actorName: e.actorUserId ? (nameById.get(e.actorUserId) ?? null) : null,
        createdAt: e.createdAt,
      }));
    });
  }
}
