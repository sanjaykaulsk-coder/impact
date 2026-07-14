import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { PlatformPermissionGuard } from '../../common/guards/platform-permission.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { TransitionCampaignDto } from './dto/transition-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { UpsertBrandingDto } from './dto/upsert-branding.dto';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  // -- Platform-level: no campaignId exists yet (create) or the list spans every client (list) --
  @UseGuards(PlatformPermissionGuard)
  @RequirePermissions('view')
  @Get()
  findAll() {
    return this.campaigns.findAll();
  }

  // Deliberately `edit`, not the generic `create` — `create` is also held by field roles
  // (Promoter, Field Executive, Vendor) for creating field records, which must not double as
  // campaign-creation rights. `edit` is scoped to the roles that actually build campaigns
  // (Campaign Manager, Project Manager, Data Administrator, platform admins).
  @UseGuards(PlatformPermissionGuard)
  @RequirePermissions('edit')
  @Post()
  create(@Body() dto: CreateCampaignDto, @CurrentUser() user: AuthenticatedUser) {
    return this.campaigns.create(dto, user.id);
  }

  // -- Campaign-scoped: caller must hold an active role on this specific campaign -----------------
  @UseGuards(CampaignScopeGuard)
  @RequirePermissions('view')
  @Get(':campaignId')
  findOne(@Param('campaignId') _campaignId: string, @CurrentTenant() tenant: TenantContext) {
    return this.campaigns.findOne(tenant);
  }

  @UseGuards(CampaignScopeGuard)
  @RequirePermissions('edit')
  @Patch(':campaignId')
  update(
    @Param('campaignId') _campaignId: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.campaigns.update(tenant, dto);
  }

  // Permission for the specific target status (e.g. `approve` to reach APPROVED) is checked
  // inside the service, since it depends on the request body — @RequirePermissions('edit') here
  // is only the baseline every transition needs.
  @UseGuards(CampaignScopeGuard)
  @RequirePermissions('edit')
  @Post(':campaignId/transition')
  transition(
    @Param('campaignId') _campaignId: string,
    @Body() dto: TransitionCampaignDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.campaigns.transition(tenant, dto.toStatus);
  }

  @UseGuards(CampaignScopeGuard)
  @Get(':campaignId/branding')
  getBranding(@Param('campaignId') _campaignId: string, @CurrentTenant() tenant: TenantContext) {
    return this.campaigns.getBranding(tenant);
  }

  @UseGuards(CampaignScopeGuard)
  @RequirePermissions('edit')
  @Put(':campaignId/branding')
  upsertBranding(
    @Param('campaignId') _campaignId: string,
    @Body() dto: UpsertBrandingDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.campaigns.upsertBranding(tenant, dto);
  }

  /**
   * Drives role-based navigation (spec item 5): the caller's *configured* permission codes for
   * this campaign, computed by CampaignScopeGuard from Role/RolePermission — never a hard-coded
   * role-name check on either side of the API boundary (spec §8).
   */
  @UseGuards(CampaignScopeGuard)
  @Get(':campaignId/my-access')
  getMyAccess(@Param('campaignId') _campaignId: string, @CurrentTenant() tenant: TenantContext) {
    return {
      roleId: tenant.roleId,
      roleCode: tenant.roleCode,
      roleName: tenant.roleName,
      permissions: tenant.permissions,
    };
  }
}
