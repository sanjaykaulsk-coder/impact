import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { CreateTargetDto } from './dto/upsert-target.dto';

// Target (spec §34) existed in the schema since early in the project with no reader or writer
// anywhere — this gives it its first real one, scoped to campaign-wide targets (TargetScopeType
// .CAMPAIGN) only. Geography/team/user-scoped targets remain schema-supported but not yet
// UI-reachable — a stated gap (docs/ASSUMPTIONS.md A-072), not a silent narrowing.
@Injectable()
export class TargetsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenant: TenantContext) {
    return this.prisma.runInTenantContext(tenant.clientId, (tx) =>
      tx.target.findMany({
        where: { campaignId: tenant.campaignId, scopeType: 'CAMPAIGN' },
        orderBy: [{ kpiKey: 'asc' }, { periodStart: 'asc' }],
      }),
    );
  }

  async create(tenant: TenantContext, dto: CreateTargetDto) {
    return this.prisma.runInTenantContext(tenant.clientId, (tx) =>
      tx.target.create({
        data: {
          clientId: tenant.clientId,
          campaignId: tenant.campaignId,
          scopeType: 'CAMPAIGN',
          kpiKey: dto.kpiKey,
          targetValue: dto.targetValue,
          periodStart: dto.periodStart ? new Date(dto.periodStart) : null,
          periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : null,
        },
      }),
    );
  }

  async remove(tenant: TenantContext, targetId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const existing = await tx.target.findFirst({ where: { id: targetId, campaignId: tenant.campaignId } });
      if (!existing) throw new NotFoundException('Target not found in this campaign');
      await tx.target.delete({ where: { id: targetId } });
      return { id: targetId };
    });
  }
}
