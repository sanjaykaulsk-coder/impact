import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { DashboardService } from './dashboard.service';

// Gated on 'approve', the same permission Team Dashboard/Exceptions/Alerts already use — this is
// team-wide and cross-location data a field worker (plain 'view' only) shouldn't see about peers.
@Controller('campaigns/:campaignId/dashboard')
@UseGuards(CampaignScopeGuard)
@RequirePermissions('approve')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary(@Param('campaignId') _campaignId: string, @Query('date') date: string | undefined, @CurrentTenant() tenant: TenantContext) {
    return this.dashboard.summary(tenant, date);
  }

  @Get('drill-down')
  drillDown(
    @Param('campaignId') _campaignId: string,
    @Query('state') state: string | undefined,
    @Query('district') district: string | undefined,
    @Query('tehsil') tehsil: string | undefined,
    @Query('locationName') locationName: string | undefined,
    @Query('activityInstanceId') activityInstanceId: string | undefined,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.dashboard.drillDown(tenant, { state, district, tehsil, locationName, activityInstanceId });
  }

  @Get('live-map')
  liveMap(@Param('campaignId') _campaignId: string, @Query('date') date: string | undefined, @CurrentTenant() tenant: TenantContext) {
    return this.dashboard.liveMap(tenant, date);
  }
}
