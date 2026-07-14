import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CampaignScopeGuard } from '../../common/guards/campaign-scope.guard';
import { TenantContext } from '../../core/prisma/tenant-context';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@Controller('campaigns/:campaignId/assignments')
@UseGuards(CampaignScopeGuard)
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @RequirePermissions('view')
  @Get()
  findAll(@Param('campaignId') _campaignId: string, @CurrentTenant() tenant: TenantContext) {
    return this.assignments.findAll(tenant);
  }

  @RequirePermissions('allocate')
  @Get('available-users')
  availableUsers(@Param('campaignId') _campaignId: string, @CurrentTenant() tenant: TenantContext) {
    return this.assignments.availableUsers(tenant);
  }

  @RequirePermissions('allocate')
  @Get('available-rows')
  availableRows(@Param('campaignId') _campaignId: string, @CurrentTenant() tenant: TenantContext) {
    return this.assignments.availableRows(tenant);
  }

  @RequirePermissions('allocate')
  @Post()
  create(
    @Param('campaignId') _campaignId: string,
    @Body() dto: CreateAssignmentDto,
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assignments.create(tenant, dto, user.id);
  }

  @RequirePermissions('allocate')
  @Patch(':assignmentId')
  update(
    @Param('campaignId') _campaignId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.assignments.update(tenant, assignmentId, dto);
  }
}
