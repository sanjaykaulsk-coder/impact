import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { CreateTargetDto } from './dto/upsert-target.dto';
import { TargetsService } from './targets.service';

// Targets share manage_forms, the same permission SKU Master/Activity Templates/Workflow Builder
// use — setting a KPI target is campaign configuration, not a field-ops action.
@Controller('campaigns/:campaignId/targets')
@UseGuards(CampaignScopeGuard)
export class TargetsController {
  constructor(private readonly targets: TargetsService) {}

  @RequirePermissions('view_reports')
  @Get()
  findAll(@Param('campaignId') _campaignId: string, @CurrentTenant() tenant: TenantContext) {
    return this.targets.list(tenant);
  }

  @RequirePermissions('manage_forms')
  @Post()
  create(
    @Param('campaignId') _campaignId: string,
    @Body() dto: CreateTargetDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.targets.create(tenant, dto);
  }

  @RequirePermissions('manage_forms')
  @Delete(':targetId')
  remove(
    @Param('campaignId') _campaignId: string,
    @Param('targetId') targetId: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.targets.remove(tenant, targetId);
  }
}
