import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { CreateFormTemplateDto } from './dto/create-form-template.dto';
import { UpdateFormTemplateDto } from './dto/update-form-template.dto';
import { UpsertDraftFormDto } from './dto/upsert-draft-form.dto';
import { FormsService } from './forms.service';

// Every route here is campaign-scoped (a form template always belongs to exactly one campaign),
// so this controller — unlike Clients/Campaigns — has no platform-level list/create routes.
@Controller('campaigns/:campaignId/form-templates')
@UseGuards(CampaignScopeGuard)
export class FormsController {
  constructor(private readonly forms: FormsService) {}

  @RequirePermissions('view')
  @Get()
  findAll(@Param('campaignId') _campaignId: string, @CurrentTenant() tenant: TenantContext) {
    return this.forms.findAll(tenant);
  }

  @RequirePermissions('manage_forms')
  @Post()
  create(
    @Param('campaignId') _campaignId: string,
    @Body() dto: CreateFormTemplateDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.forms.create(tenant, dto, user.id);
  }

  @RequirePermissions('view')
  @Get(':templateId')
  findOne(
    @Param('campaignId') _campaignId: string,
    @Param('templateId') templateId: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.forms.findOne(tenant, templateId);
  }

  @RequirePermissions('manage_forms')
  @Patch(':templateId')
  update(
    @Param('campaignId') _campaignId: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpdateFormTemplateDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.forms.update(tenant, templateId, dto);
  }

  @RequirePermissions('manage_forms')
  @Put(':templateId/draft')
  upsertDraft(
    @Param('campaignId') _campaignId: string,
    @Param('templateId') templateId: string,
    @Body() dto: UpsertDraftFormDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.forms.upsertDraft(tenant, templateId, dto);
  }

  @RequirePermissions('manage_forms')
  @Post(':templateId/publish')
  publish(
    @Param('campaignId') _campaignId: string,
    @Param('templateId') templateId: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.forms.publish(tenant, templateId);
  }
}
