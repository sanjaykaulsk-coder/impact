import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApprovalStatus } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { DecideApprovalDto } from './dto/decide-approval.dto';
import { SupervisorService } from './supervisor.service';

const VALID_STATUSES: ApprovalStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

// Gated on 'approve' — every supervisor-category role in the seed (Activity Supervisor, Field
// Supervisor, Activity Spoke, Regional/National Operations Head...) already carries it, and it's
// the one permission code that means "can act on a review," matching 'reject' being granted
// alongside it everywhere in the seed data rather than needing a third, redundant code.
@Controller('campaigns/:campaignId/supervisor')
@UseGuards(CampaignScopeGuard)
@RequirePermissions('approve')
export class SupervisorController {
  constructor(private readonly supervisor: SupervisorService) {}

  @Get('inbox')
  inbox(
    @Param('campaignId') _campaignId: string,
    @Query('status') status: string | undefined,
    @CurrentTenant() tenant: TenantContext,
  ) {
    const resolved = (status?.toUpperCase() as ApprovalStatus) || 'PENDING';
    if (!VALID_STATUSES.includes(resolved)) {
      throw new BadRequestException(`status must be one of ${VALID_STATUSES.join(', ')}`);
    }
    return this.supervisor.inbox(tenant, resolved);
  }

  @Get('approvals/:approvalId')
  detail(
    @Param('campaignId') _campaignId: string,
    @Param('approvalId') approvalId: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.supervisor.detail(tenant, approvalId);
  }

  @Post('approvals/:approvalId/decide')
  decide(
    @Param('campaignId') _campaignId: string,
    @Param('approvalId') approvalId: string,
    @Body() dto: DecideApprovalDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.supervisor.decide(tenant, approvalId, user.id, dto);
  }
}
