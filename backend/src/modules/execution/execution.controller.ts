import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { CHUNK_SIZE_BYTES } from './execution.constants';
import { GpsEventDto } from './dto/gps-event.dto';
import { IngestGpsPointsDto } from './dto/ingest-gps-points.dto';
import { InitMediaUploadDto } from './dto/init-media-upload.dto';
import { MarkSopItemDto } from './dto/mark-sop-item.dto';
import { SubmitDeviationRequestDto } from './dto/submit-deviation-request.dto';
import { SubmitMilestoneDto } from './dto/submit-milestone.dto';
import { ExecutionService } from './execution.service';

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
  //
  // Chunked, resumable upload (docs/architecture/05): init -> N chunk posts -> complete. A
  // single-shot upload was tried first and doesn't survive a real phone's real Wi-Fi dropping
  // mid-transfer — see ExecutionService's comment on why this replaced it.
  @RequirePermissions('create')
  @Post('activity-instances/:activityInstanceId/media/init')
  initMediaUpload(
    @Param('campaignId') _campaignId: string,
    @Param('activityInstanceId') activityInstanceId: string,
    @Body() dto: InitMediaUploadDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.execution.initMediaUpload(tenant, activityInstanceId, user.id, dto);
  }

  @RequirePermissions('create')
  @Post('activity-instances/:activityInstanceId/media/sessions/:sessionId/chunks/:index')
  @UseInterceptors(FileInterceptor('chunk', { limits: { fileSize: CHUNK_SIZE_BYTES } }))
  uploadMediaChunk(
    @Param('campaignId') _campaignId: string,
    @Param('activityInstanceId') activityInstanceId: string,
    @Param('sessionId') sessionId: string,
    @Param('index', ParseIntPipe) index: number,
    @UploadedFile() chunk: Express.Multer.File,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!chunk) throw new BadRequestException('No chunk was uploaded');
    return this.execution.uploadMediaChunk(tenant, activityInstanceId, user.id, sessionId, index, chunk.buffer);
  }

  @RequirePermissions('create')
  @Post('activity-instances/:activityInstanceId/media/sessions/:sessionId/complete')
  completeMediaUpload(
    @Param('campaignId') _campaignId: string,
    @Param('activityInstanceId') activityInstanceId: string,
    @Param('sessionId') sessionId: string,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.execution.completeMediaUpload(tenant, activityInstanceId, user.id, sessionId);
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

  @RequirePermissions('create')
  @Post('activity-instances/:activityInstanceId/sop-checklist/:itemId')
  markSopItem(
    @Param('campaignId') _campaignId: string,
    @Param('activityInstanceId') activityInstanceId: string,
    @Param('itemId') itemId: string,
    @Body() dto: MarkSopItemDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.execution.markSopChecklistItem(tenant, activityInstanceId, itemId, user.id, dto.status, dto.remarks);
  }

  @RequirePermissions('create')
  @Post('activity-instances/:activityInstanceId/resubmit')
  resubmit(
    @Param('campaignId') _campaignId: string,
    @Param('activityInstanceId') activityInstanceId: string,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.execution.resubmit(tenant, activityInstanceId, user.id);
  }

  @RequirePermissions('create')
  @Post('activity-instances/:activityInstanceId/gps-points')
  ingestGpsPoints(
    @Param('campaignId') _campaignId: string,
    @Param('activityInstanceId') activityInstanceId: string,
    @Body() dto: IngestGpsPointsDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.execution.ingestGpsPoints(tenant, activityInstanceId, user.id, dto);
  }

  @RequirePermissions('create')
  @Post('activity-instances/:activityInstanceId/deviation-requests')
  submitDeviationRequest(
    @Param('campaignId') _campaignId: string,
    @Param('activityInstanceId') activityInstanceId: string,
    @Body() dto: SubmitDeviationRequestDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.execution.submitDeviationRequest(tenant, activityInstanceId, user.id, dto);
  }
}
