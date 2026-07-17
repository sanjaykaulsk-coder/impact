import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { CreateSkuDto, UpdateSkuDto } from './dto/upsert-sku.dto';
import { SkusService } from './skus.service';

// SKU management shares the manage_forms permission: the SKU master exists to feed per-SKU form
// questions (report-format-library §3), so whoever configures forms configures SKUs.
@Controller('campaigns/:campaignId/skus')
@UseGuards(CampaignScopeGuard)
export class SkusController {
  constructor(private readonly skus: SkusService) {}

  @RequirePermissions('view')
  @Get()
  findAll(
    @Param('campaignId') _campaignId: string,
    @Query('includeInactive') includeInactive: string | undefined,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.skus.findAll(tenant, includeInactive === 'true');
  }

  @RequirePermissions('manage_forms')
  @Post()
  create(
    @Param('campaignId') _campaignId: string,
    @Body() dto: CreateSkuDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.skus.create(tenant, dto);
  }

  @RequirePermissions('manage_forms')
  @Patch(':skuId')
  update(
    @Param('campaignId') _campaignId: string,
    @Param('skuId') skuId: string,
    @Body() dto: UpdateSkuDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.skus.update(tenant, skuId, dto);
  }
}
