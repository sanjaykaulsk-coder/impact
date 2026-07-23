import { Controller, Get, Header, Param, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { ReportsService } from './reports.service';

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

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

  @Get('dfr.xlsx')
  @Header('Content-Type', XLSX_CONTENT_TYPE)
  @Header('Content-Disposition', 'attachment; filename="DFR.xlsx"')
  async dfrExcel(
    @Param('campaignId') _campaignId: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const buffer = await this.reports.dfrWorkbook(tenant, from, to);
    return new StreamableFile(buffer);
  }

  @Get('stock-reconciliation.xlsx')
  @Header('Content-Type', XLSX_CONTENT_TYPE)
  @Header('Content-Disposition', 'attachment; filename="Stock-Reconciliation.xlsx"')
  async stockReconciliationExcel(
    @Param('campaignId') _campaignId: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const buffer = await this.reports.stockReconciliationWorkbook(tenant, from, to);
    return new StreamableFile(buffer);
  }

  @Get('weekly')
  weekly(
    @Param('campaignId') _campaignId: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.reports.weekly(tenant, from, to);
  }

  @Get('weekly.xlsx')
  @Header('Content-Type', XLSX_CONTENT_TYPE)
  @Header('Content-Disposition', 'attachment; filename="Weekly-Report.xlsx"')
  async weeklyExcel(
    @Param('campaignId') _campaignId: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const buffer = await this.reports.weeklyWorkbook(tenant, from, to);
    return new StreamableFile(buffer);
  }

  @Get('closure')
  closure(@Param('campaignId') _campaignId: string, @CurrentTenant() tenant: TenantContext) {
    return this.reports.closure(tenant);
  }

  @Get('closure.xlsx')
  @Header('Content-Type', XLSX_CONTENT_TYPE)
  @Header('Content-Disposition', 'attachment; filename="Campaign-Closure-Report.xlsx"')
  async closureExcel(@Param('campaignId') _campaignId: string, @CurrentTenant() tenant: TenantContext) {
    const buffer = await this.reports.closureWorkbook(tenant);
    return new StreamableFile(buffer);
  }
}
