import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { CreatePjpDto, PjpRowInputDto } from './dto/create-pjp.dto';
import { CancelPjpRowDto, PostponePjpRowDto, ReassignPjpRowDto, ReschedulePjpRowDto } from './dto/pjp-row-actions.dto';
import { UpdatePjpRowDto } from './dto/update-pjp-row.dto';
import { PjpService } from './pjp.service';

@Controller('campaigns/:campaignId/pjps')
@UseGuards(CampaignScopeGuard)
export class PjpController {
  constructor(private readonly pjp: PjpService) {}

  @RequirePermissions('view')
  @Get()
  findAll(@Param('campaignId') _campaignId: string, @CurrentTenant() tenant: TenantContext) {
    return this.pjp.findAll(tenant);
  }

  @RequirePermissions('manage_pjp')
  @Post()
  create(
    @Param('campaignId') _campaignId: string,
    @Body() dto: CreatePjpDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pjp.create(tenant, dto, user.id);
  }

  /**
   * A single manually-typed location, for a campaign with no PJP file uploaded (or one more stop
   * added without redoing the whole CSV flow) — see PjpService.addManualLocation.
   */
  @RequirePermissions('manage_pjp')
  @Post('manual-row')
  addManualLocation(
    @Param('campaignId') _campaignId: string,
    @Body() dto: PjpRowInputDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pjp.addManualLocation(tenant, dto, user.id);
  }

  /** State/District/Tehsil/Location autocomplete + coordinate auto-fill (founder request) — every
   * distinct combination already used in this campaign's PJP rows. */
  @RequirePermissions('view')
  @Get('known-locations')
  knownLocations(@Param('campaignId') _campaignId: string, @CurrentTenant() tenant: TenantContext) {
    return this.pjp.knownLocations(tenant);
  }

  /** "Suggest lat/long" (founder request) — a real OpenStreetMap geocode lookup for a location
   * that's never been entered before. */
  @RequirePermissions('view')
  @Get('geocode')
  geocode(
    @Param('campaignId') _campaignId: string,
    @Query('locationName') locationName: string | undefined,
    @Query('tehsilName') tehsilName: string | undefined,
    @Query('districtName') districtName: string | undefined,
    @Query('stateName') stateName: string | undefined,
  ) {
    return this.pjp.geocode({ locationName, tehsilName, districtName, stateName });
  }

  @RequirePermissions('view')
  @Get(':pjpId')
  findOne(@Param('campaignId') _campaignId: string, @Param('pjpId') pjpId: string, @CurrentTenant() tenant: TenantContext) {
    return this.pjp.findOne(tenant, pjpId);
  }

  @RequirePermissions('manage_pjp')
  @Post(':pjpId/publish')
  publish(@Param('campaignId') _campaignId: string, @Param('pjpId') pjpId: string, @CurrentTenant() tenant: TenantContext) {
    return this.pjp.publish(tenant, pjpId);
  }

  @RequirePermissions('manage_pjp')
  @Patch(':pjpId/rows/:rowId')
  updateRow(
    @Param('campaignId') _campaignId: string,
    @Param('pjpId') pjpId: string,
    @Param('rowId') rowId: string,
    @Body() dto: UpdatePjpRowDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.pjp.updateRow(tenant, pjpId, rowId, dto);
  }

  @RequirePermissions('manage_pjp')
  @Post(':pjpId/rows/:rowId/cancel')
  cancelRow(
    @Param('campaignId') _campaignId: string,
    @Param('pjpId') pjpId: string,
    @Param('rowId') rowId: string,
    @Body() dto: CancelPjpRowDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.pjp.cancelRow(tenant, pjpId, rowId, dto);
  }

  @RequirePermissions('manage_pjp')
  @Post(':pjpId/rows/:rowId/postpone')
  postponeRow(
    @Param('campaignId') _campaignId: string,
    @Param('pjpId') pjpId: string,
    @Param('rowId') rowId: string,
    @Body() dto: PostponePjpRowDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.pjp.postponeRow(tenant, pjpId, rowId, dto);
  }

  @RequirePermissions('manage_pjp')
  @Post(':pjpId/rows/:rowId/reschedule')
  rescheduleRow(
    @Param('campaignId') _campaignId: string,
    @Param('pjpId') pjpId: string,
    @Param('rowId') rowId: string,
    @Body() dto: ReschedulePjpRowDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.pjp.rescheduleRow(tenant, pjpId, rowId, dto);
  }

  @RequirePermissions('manage_pjp')
  @Post(':pjpId/rows/:rowId/reassign')
  reassignRow(
    @Param('campaignId') _campaignId: string,
    @Param('pjpId') pjpId: string,
    @Param('rowId') rowId: string,
    @Body() dto: ReassignPjpRowDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.pjp.reassignRow(tenant, pjpId, rowId, dto);
  }

  @RequirePermissions('view')
  @Get(':pjpId/rows/:rowId/history')
  rowHistory(
    @Param('campaignId') _campaignId: string,
    @Param('pjpId') pjpId: string,
    @Param('rowId') rowId: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.pjp.rowHistory(tenant, pjpId, rowId);
  }
}
