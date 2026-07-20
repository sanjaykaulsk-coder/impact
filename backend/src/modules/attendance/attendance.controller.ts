import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

// Same guard shape as ExecutionController: every route here is a field worker acting on their own
// attendance for the day, gated by an active role in the campaign ('view' to read, 'create' to
// write) — never someone else's.
@Controller('campaigns/:campaignId/attendance')
@UseGuards(CampaignScopeGuard)
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @RequirePermissions('view')
  @Get('today')
  today(@Param('campaignId') _campaignId: string, @CurrentTenant() tenant: TenantContext, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.today(tenant, user.id);
  }

  @RequirePermissions('create')
  @Post('day-start')
  dayStart(
    @Param('campaignId') _campaignId: string,
    @Body() dto: MarkAttendanceDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendance.dayStart(tenant, user.id, dto);
  }

  @RequirePermissions('create')
  @Post('day-end')
  dayEnd(
    @Param('campaignId') _campaignId: string,
    @Body() dto: MarkAttendanceDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendance.dayEnd(tenant, user.id, dto);
  }
}
