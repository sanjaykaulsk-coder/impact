import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { CreateSkuDto, UpdateSkuDto } from './dto/upsert-sku.dto';

// Campaign SKU Master (report-format-library §3): the per-campaign product list every
// sales/stock-reporting form binds its per-SKU questions to. Never hard-coded per client.
@Injectable()
export class SkusService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenant: TenantContext, includeInactive = false) {
    return this.prisma.runInTenantContext(tenant.clientId, (tx) =>
      tx.campaignSku.findMany({
        where: { campaignId: tenant.campaignId, ...(includeInactive ? {} : { isActive: true }) },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      }),
    );
  }

  async create(tenant: TenantContext, dto: CreateSkuDto) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const clash = await tx.campaignSku.findFirst({
        where: { campaignId: tenant.campaignId, skuCode: dto.skuCode },
      });
      if (clash) throw new BadRequestException(`SKU code "${dto.skuCode}" already exists in this campaign`);
      return tx.campaignSku.create({
        data: {
          clientId: tenant.clientId,
          campaignId: tenant.campaignId,
          skuCode: dto.skuCode,
          name: dto.name,
          variantLabel: dto.variantLabel,
          category: dto.category,
          mrp: dto.mrp,
          sellingPrice: dto.sellingPrice,
          packSize: dto.packSize,
        },
      });
    });
  }

  async update(tenant: TenantContext, skuId: string, dto: UpdateSkuDto) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const existing = await tx.campaignSku.findFirst({ where: { id: skuId, campaignId: tenant.campaignId } });
      if (!existing) throw new NotFoundException('SKU not found in this campaign');
      if (dto.skuCode && dto.skuCode !== existing.skuCode) {
        const clash = await tx.campaignSku.findFirst({
          where: { campaignId: tenant.campaignId, skuCode: dto.skuCode, id: { not: skuId } },
        });
        if (clash) throw new BadRequestException(`SKU code "${dto.skuCode}" already exists in this campaign`);
      }
      return tx.campaignSku.update({
        where: { id: skuId },
        data: {
          ...(dto.skuCode !== undefined ? { skuCode: dto.skuCode } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.variantLabel !== undefined ? { variantLabel: dto.variantLabel } : {}),
          ...(dto.category !== undefined ? { category: dto.category } : {}),
          ...(dto.mrp !== undefined ? { mrp: dto.mrp } : {}),
          ...(dto.sellingPrice !== undefined ? { sellingPrice: dto.sellingPrice } : {}),
          ...(dto.packSize !== undefined ? { packSize: dto.packSize } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
    });
  }
}
