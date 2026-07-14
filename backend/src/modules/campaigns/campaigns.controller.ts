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
}
