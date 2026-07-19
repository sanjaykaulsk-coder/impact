import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { ActivityTemplatesService } from './activity-templates.service';
import { ApplyTemplateDto } from './dto/apply-template.dto';

// The library listing itself isn't campaign-scoped (it's a platform-wide catalogue), but every
// route still lives under a campaign so CampaignScopeGuard can confirm the caller actually has a
// role — and manage_forms permission — in the campaign they're browsing templates for.
@Controller('campaigns/:campaignId/activity-templates')
@UseGuards(CampaignScopeGuard)
export class ActivityTemplatesController {
  constructor(private readonly activityTemplates: ActivityTemplatesService) {}

  @RequirePermissions('view')
  @Get()
  findAll(@Param('campaignId') _campaignId: string) {
    return this.activityTemplates.findAll();
  }

  @RequirePermissions('manage_forms')
  @Post('apply')
  apply(
    @Param('campaignId') _campaignId: string,
    @Body() dto: ApplyTemplateDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.activityTemplates.apply(tenant, dto);
  }
}
