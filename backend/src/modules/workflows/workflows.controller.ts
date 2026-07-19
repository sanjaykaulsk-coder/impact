import { Body, Controller, Delete, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { UpsertWorkflowDto } from './dto/upsert-workflow.dto';
import { WorkflowsService } from './workflows.service';

// Workflow configuration shares manage_forms (like SKU management in S3.1) — it's the same
// "configure this campaign" permission bucket, and no role in the seed matrix needs one without
// the other.
@Controller('campaigns/:campaignId/workflow')
@UseGuards(CampaignScopeGuard)
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowsService) {}

  @RequirePermissions('view')
  @Get()
  findOne(@Param('campaignId') _campaignId: string, @CurrentTenant() tenant: TenantContext) {
    return this.workflows.findOne(tenant);
  }

  @RequirePermissions('view')
  @Get('roles')
  listRoles() {
    return this.workflows.listRoles();
  }

  @RequirePermissions('manage_forms')
  @Put()
  upsert(
    @Param('campaignId') _campaignId: string,
    @Body() dto: UpsertWorkflowDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.workflows.upsert(tenant, dto);
  }

  @RequirePermissions('manage_forms')
  @Delete()
  delete(@Param('campaignId') _campaignId: string, @CurrentTenant() tenant: TenantContext) {
    return this.workflows.delete(tenant);
  }

  @RequirePermissions('view_reports')
  @Get('readiness')
  readiness(
    @Param('campaignId') _campaignId: string,
    @Query('date') date: string | undefined,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.workflows.readiness(tenant, date);
  }
}
