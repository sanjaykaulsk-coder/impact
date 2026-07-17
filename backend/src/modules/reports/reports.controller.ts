import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { ReportsService } from './reports.service';

@Controller('campaigns/:campaignId/reports')
@UseGuards(CampaignScopeGuard)
@RequirePermissions('view_reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('dfr')
  dfr(
    @Param('campaignId') _campaignId: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.reports.dfr(tenant, from, to);
  }

  @Get('stock-reconciliation')
  stockReconciliation(
    @Param('campaignId') _campaignId: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.reports.stockReconciliation(tenant, from, to);
  }
}
