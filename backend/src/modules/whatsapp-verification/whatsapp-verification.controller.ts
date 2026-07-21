import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { CompleteWhatsAppVerificationDto, StartWhatsAppVerificationDto } from './dto/whatsapp-verification.dto';
import { WhatsAppVerificationService } from './whatsapp-verification.service';

// Gated on 'approve' — a supervisor action (spec §31: "Supervisor opens activity -> Start
// Verification Call"), not a field-worker one.
@Controller('campaigns/:campaignId')
@UseGuards(CampaignScopeGuard)
@RequirePermissions('approve')
export class WhatsAppVerificationController {
  constructor(private readonly verification: WhatsAppVerificationService) {}

  @Get('activity-instances/:activityInstanceId/whatsapp-verification')
  history(
    @Param('campaignId') _campaignId: string,
    @Param('activityInstanceId') activityInstanceId: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.verification.history(tenant, activityInstanceId);
  }

  @Post('activity-instances/:activityInstanceId/whatsapp-verification/start')
  start(
    @Param('campaignId') _campaignId: string,
    @Param('activityInstanceId') activityInstanceId: string,
    @Body() dto: StartWhatsAppVerificationDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.verification.start(tenant, activityInstanceId, user.id, dto);
  }

  @Post('whatsapp-verification/:verificationId/complete')
  complete(
    @Param('campaignId') _campaignId: string,
    @Param('verificationId') verificationId: string,
    @Body() dto: CompleteWhatsAppVerificationDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.verification.complete(tenant, verificationId, user.id, dto);
  }
}
