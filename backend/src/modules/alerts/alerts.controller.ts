import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AlertStatus } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { AlertsService } from './alerts.service';
import { ResolveAlertDto } from './dto/resolve-alert.dto';

const VALID_STATUSES: AlertStatus[] = ['OPEN', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED'];

// Gated on 'approve', same as Exceptions and the team dashboard — supervisor-category roles only.
@Controller('campaigns/:campaignId/alerts')
@UseGuards(CampaignScopeGuard)
@RequirePermissions('approve')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  list(@Param('campaignId') _campaignId: string, @Query('status') status: string | undefined, @CurrentTenant() tenant: TenantContext) {
    if (status && !VALID_STATUSES.includes(status as AlertStatus)) {
      throw new BadRequestException(`status must be one of ${VALID_STATUSES.join(', ')}`);
    }
    return this.alerts.list(tenant, status as AlertStatus | undefined);
  }

  @Post(':alertId/acknowledge')
  acknowledge(
    @Param('campaignId') _campaignId: string,
    @Param('alertId') alertId: string,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alerts.acknowledge(tenant, alertId, user.id);
  }

  @Post(':alertId/resolve')
  resolve(
    @Param('campaignId') _campaignId: string,
    @Param('alertId') alertId: string,
    @Body() dto: ResolveAlertDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alerts.resolve(tenant, alertId, user.id, dto.remarks);
  }

  @Post(':alertId/escalate')
  escalate(
    @Param('campaignId') _campaignId: string,
    @Param('alertId') alertId: string,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alerts.escalate(tenant, alertId, user.id);
  }
}
