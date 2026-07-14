import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @UseGuards(CampaignScopeGuard)
  @Get(':campaignId/branding')
  getBranding(@Param('campaignId') _campaignId: string, @CurrentTenant() tenant: TenantContext) {
    return this.campaigns.getBranding(tenant);
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
