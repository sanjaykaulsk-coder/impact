import { Controller, Get, Header, Param, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { MapTileService } from '../../core/storage/map-tile.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { MapCorridorService } from './map-corridor.service';

// Gated on 'view' (universal) — a field worker fetching their own day's offline map corridor is
// a low-sensitivity read, the same posture as the live-map/team-dashboard read endpoints.
@Controller('campaigns/:campaignId/map-corridor')
@UseGuards(CampaignScopeGuard)
export class MapCorridorController {
  constructor(
    private readonly mapCorridor: MapCorridorService,
    private readonly mapTiles: MapTileService,
  ) {}

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

  // Proxies tile bytes through the app's one API host rather than a signed MinIO URL — see
  // MapTileService.getTileBuffer()'s doc comment for why a direct-to-MinIO URL doesn't work from
  // a phone or emulator.
  @RequirePermissions('view')
  @Get('tile/:z/:x/:y')
  @Header('Content-Type', 'image/png')
  async getTile(
    @Param('campaignId') _campaignId: string,
    @Param('z') z: string,
    @Param('x') x: string,
    @Param('y') y: string,
  ) {
    const buffer = await this.mapTiles.getTileBuffer(parseInt(z, 10), parseInt(x, 10), parseInt(y, 10));
    return new StreamableFile(buffer);
  }
}
