import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ExceptionStatus } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { ActionTakenDto, AssignExceptionDto, ReopenExceptionDto, ResolveExceptionDto } from './dto/exception-actions.dto';
import { ExceptionsService } from './exceptions.service';

const VALID_STATUSES: ExceptionStatus[] = [
  'DETECTED',
  'ASSIGNED',
  'ACKNOWLEDGED',
  'UNDER_REVIEW',
  'ACTION_TAKEN',
  'RESOLVED',
  'CLOSURE_APPROVED',
  'REOPENED',
];

// Gated on 'approve' — same permission the deviation/approval inboxes and team dashboard use,
// held by every supervisor-category role but not by field-worker roles.
@Controller('campaigns/:campaignId/exceptions')
@UseGuards(CampaignScopeGuard)
@RequirePermissions('approve')
export class ExceptionsController {
  constructor(private readonly exceptions: ExceptionsService) {}

  @Get()
  list(@Param('campaignId') _campaignId: string, @Query('status') status: string | undefined, @CurrentTenant() tenant: TenantContext) {
    if (status && !VALID_STATUSES.includes(status as ExceptionStatus)) {
      throw new BadRequestException(`status must be one of ${VALID_STATUSES.join(', ')}`);
    }
    return this.exceptions.list(tenant, status as ExceptionStatus | undefined);
  }

  @Get(':exceptionId')
  detail(@Param('campaignId') _campaignId: string, @Param('exceptionId') exceptionId: string, @CurrentTenant() tenant: TenantContext) {
    return this.exceptions.detail(tenant, exceptionId);
  }

  @Post(':exceptionId/assign')
  assign(
    @Param('campaignId') _campaignId: string,
    @Param('exceptionId') exceptionId: string,
    @Body() dto: AssignExceptionDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exceptions.assign(tenant, exceptionId, user.id, dto.ownerUserId);
  }

  @Post(':exceptionId/acknowledge')
  acknowledge(
    @Param('campaignId') _campaignId: string,
    @Param('exceptionId') exceptionId: string,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exceptions.acknowledge(tenant, exceptionId, user.id);
  }

  @Post(':exceptionId/start-review')
  startReview(
    @Param('campaignId') _campaignId: string,
    @Param('exceptionId') exceptionId: string,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exceptions.startReview(tenant, exceptionId, user.id);
  }

  @Post(':exceptionId/action-taken')
  actionTaken(
    @Param('campaignId') _campaignId: string,
    @Param('exceptionId') exceptionId: string,
    @Body() dto: ActionTakenDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exceptions.actionTaken(tenant, exceptionId, user.id, dto.remarks);
  }

  @Post(':exceptionId/resolve')
  resolve(
    @Param('campaignId') _campaignId: string,
    @Param('exceptionId') exceptionId: string,
    @Body() dto: ResolveExceptionDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exceptions.resolve(tenant, exceptionId, user.id, dto.resolution);
  }

  @Post(':exceptionId/approve-closure')
  approveClosure(
    @Param('campaignId') _campaignId: string,
    @Param('exceptionId') exceptionId: string,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exceptions.approveClosure(tenant, exceptionId, user.id);
  }

  @Post(':exceptionId/reopen')
  reopen(
    @Param('campaignId') _campaignId: string,
    @Param('exceptionId') exceptionId: string,
    @Body() dto: ReopenExceptionDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exceptions.reopen(tenant, exceptionId, user.id, dto.remarks);
  }

  @Post(':exceptionId/escalate')
  escalate(
    @Param('campaignId') _campaignId: string,
    @Param('exceptionId') exceptionId: string,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.exceptions.escalate(tenant, exceptionId, user.id);
  }
}
