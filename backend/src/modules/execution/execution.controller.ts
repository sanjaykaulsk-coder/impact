import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { GpsEventDto } from './dto/gps-event.dto';
import { SubmitMilestoneDto } from './dto/submit-milestone.dto';
import { UploadMediaDto } from './dto/upload-media.dto';
import { ExecutionService } from './execution.service';

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

// Every route here is a field worker acting on their own assignment/activity — gated by
// CampaignScopeGuard (an active role in the campaign) plus ExecutionService's own ownership check
// (the activity must actually be assigned to the caller), never just "any campaign member."
@Controller('campaigns/:campaignId')
@UseGuards(CampaignScopeGuard)
export class ExecutionController {
  constructor(private readonly execution: ExecutionService) {}

  @RequirePermissions('view')
  @Get('assignments/:assignmentId/activity')
  getOrCreateActivity(
    @Param('campaignId') _campaignId: string,
    @Param('assignmentId') assignmentId: string,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.execution.getOrCreateActivityForAssignment(tenant, assignmentId, user.id);
  }

  @RequirePermissions('view')
  @Get('activity-instances/:activityInstanceId')
  getActivity(
    @Param('campaignId') _campaignId: string,
    @Param('activityInstanceId') activityInstanceId: string,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.execution.getActivity(tenant, activityInstanceId, user.id);
  }

  @RequirePermissions('create')
  @Post('activity-instances/:activityInstanceId/check-in')
  checkIn(
    @Param('campaignId') _campaignId: string,
    @Param('activityInstanceId') activityInstanceId: string,
    @Body() dto: GpsEventDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.execution.checkIn(tenant, activityInstanceId, user.id, dto);
  }

  // Camera-only evidence (spec §17): the app must never offer a gallery picker for this field —
  // that's a client-side constraint (see the Flutter capture screen), not something the API can
  // enforce on the bytes it receives, so the API's job is capturing GPS+timestamp alongside every
  // upload and burning them into a watermark, not policing where the JPEG came from.
  @RequirePermissions('create')
  @Post('activity-instances/:activityInstanceId/media')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_PHOTO_BYTES } }))
  uploadMedia(
    @Param('campaignId') _campaignId: string,
    @Param('activityInstanceId') activityInstanceId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('No photo was uploaded');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('Only image uploads are accepted here');
    return this.execution.uploadMedia(tenant, activityInstanceId, user.id, file, dto);
  }

  @RequirePermissions('create')
  @Post('activity-instances/:activityInstanceId/milestone-response')
  submitMilestoneResponse(
    @Param('campaignId') _campaignId: string,
    @Param('activityInstanceId') activityInstanceId: string,
    @Body() dto: SubmitMilestoneDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.execution.submitMilestoneResponse(tenant, activityInstanceId, user.id, dto);
  }

  @RequirePermissions('create')
  @Post('activity-instances/:activityInstanceId/check-out')
  checkOut(
    @Param('campaignId') _campaignId: string,
    @Param('activityInstanceId') activityInstanceId: string,
    @Body() dto: GpsEventDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.execution.checkOut(tenant, activityInstanceId, user.id, dto);
  }
}
