import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { CreatePjpDto, PjpRowInputDto } from './dto/create-pjp.dto';
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
}
