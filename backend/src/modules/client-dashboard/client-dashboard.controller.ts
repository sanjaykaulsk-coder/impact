import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { ClientDashboardService } from './client-dashboard.service';
import { SetDashboardConfigDto } from './dto/set-dashboard-config.dto';

// Gated on 'view' (not 'approve', unlike the Impact-staff Overview page) — every role including
// client_viewer holds 'view', since this is deliberately the persona that dashboard is for.
// Configuring which widgets appear is gated on 'manage_forms', the same permission Targets/SKU
// Master use, since picking widgets is campaign configuration, not a viewing action.
@Controller('campaigns/:campaignId/client-dashboard')
@UseGuards(CampaignScopeGuard)
export class ClientDashboardController {
  constructor(private readonly clientDashboard: ClientDashboardService) {}

  @RequirePermissions('view')
  @Get()
  render(@Param('campaignId') _campaignId: string, @CurrentTenant() tenant: TenantContext) {
    return this.clientDashboard.render(tenant);
  }

  @RequirePermissions('manage_forms')
  @Get('config')
  getConfig(@Param('campaignId') _campaignId: string, @CurrentTenant() tenant: TenantContext) {
    return this.clientDashboard.getConfig(tenant);
  }

  @RequirePermissions('manage_forms')
  @Put('config')
  setConfig(
    @Param('campaignId') _campaignId: string,
    @Body() dto: SetDashboardConfigDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.clientDashboard.setConfig(tenant, dto.widgetKeys);
  }
}
