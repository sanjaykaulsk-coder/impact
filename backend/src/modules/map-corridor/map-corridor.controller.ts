import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { MapCorridorService } from './map-corridor.service';

// Gated on 'view' (universal) — a field worker fetching their own day's offline map corridor is
// a low-sensitivity read, the same posture as the live-map/team-dashboard read endpoints.
@Controller('campaigns/:campaignId/map-corridor')
@UseGuards(CampaignScopeGuard)
export class MapCorridorController {
  constructor(private readonly mapCorridor: MapCorridorService) {}

  @RequirePermissions('view')
  @Get(':userId')
  getCorridor(
    @Param('campaignId') _campaignId: string,
    @Param('userId') userId: string,
    @Query('date') date: string | undefined,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.mapCorridor.getCorridor(tenant, userId, date);
  }
}
