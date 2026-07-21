import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { TeamDashboardService } from './team-dashboard.service';

// Gated on 'approve' — the same permission the deviation/approval inboxes use, held by every
// supervisor-category role but not by field-worker roles (who all hold plain 'view'). This is
// team-wide data (attendance, sync status, performance) a field worker shouldn't see about peers.
@Controller('campaigns/:campaignId/team-dashboard')
@UseGuards(CampaignScopeGuard)
@RequirePermissions('approve')
export class TeamDashboardController {
  constructor(private readonly dashboard: TeamDashboardService) {}

  @Get('attendance')
  attendance(@Param('campaignId') _campaignId: string, @Query('date') date: string | undefined, @CurrentTenant() tenant: TenantContext) {
    return this.dashboard.attendance(tenant, date);
  }

  @Get('unsynced-users')
  unsyncedUsers(
    @Param('campaignId') _campaignId: string,
    @Query('thresholdHours') thresholdHours: string | undefined,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.dashboard.unsyncedUsers(tenant, thresholdHours ? Number(thresholdHours) : undefined);
  }

  @Get('delayed-activities')
  delayedActivities(@Param('campaignId') _campaignId: string, @Query('date') date: string | undefined, @CurrentTenant() tenant: TenantContext) {
    return this.dashboard.delayedActivities(tenant, date);
  }

  @Get('performance')
  performance(
    @Param('campaignId') _campaignId: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.dashboard.teamPerformance(tenant, from, to);
  }
}
