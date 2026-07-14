import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { CreatePjpDto, PjpRowInputDto } from './dto/create-pjp.dto';

interface RowValidationResult {
  rowIndex: number;
  reasons: string[];
}

@Injectable()
export class PjpService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenant: TenantContext) {
    return this.prisma.runInTenantContext(tenant.clientId, (tx) =>
      tx.pJP.findMany({ where: { campaignId: tenant.campaignId }, orderBy: { createdAt: 'desc' } }),
    );
  }

  async findOne(tenant: TenantContext, pjpId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const pjp = await tx.pJP.findFirst({
        where: { id: pjpId, campaignId: tenant.campaignId },
        include: { rows: { orderBy: { date: 'asc' } } },
      });
      if (!pjp) throw new NotFoundException('PJP not found');
      return pjp;
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

  async publish(tenant: TenantContext, pjpId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const pjp = await tx.pJP.findFirst({ where: { id: pjpId, campaignId: tenant.campaignId } });
      if (!pjp) throw new NotFoundException('PJP not found');
      if (pjp.status !== 'DRAFT') throw new BadRequestException(`Cannot publish a PJP in ${pjp.status} status`);
      return tx.pJP.update({ where: { id: pjpId }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
    });
  }
}
