import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CampaignsService } from './campaigns.service';
import { UpdatePreferredLanguageDto } from './dto/update-preferred-language.dto';

@Controller('me')
export class MeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campaigns: CampaignsService,
  ) {}

  @Get()
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    // Safe bypass: hard-filtered to the caller's own id (see CampaignsService.getMyCampaigns).
    return this.prisma.runWithBypass(async (tx) => {
      const record = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { mobileCredential: true },
      });
      return {
        id: record.id,
        fullName: record.fullName,
        preferredLanguage: record.preferredLanguage,
        mobileNumber: record.mobileCredential
          ? `${record.mobileCredential.countryCode}${record.mobileCredential.mobileNumber}`
          : null,
        lastLoginAt: record.lastLoginAt,
      };
    });
  }

  /**
   * Regional languages (Post-MVP backlog): the field app's language switcher is a self-service
   * preference change, not an admin action — hard-filtered to the caller's own id, same safe-bypass
   * reasoning as getProfile above.
   */
  @Patch('preferred-language')
  async updatePreferredLanguage(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePreferredLanguageDto,
  ) {
    return this.prisma.runWithBypass(async (tx) => {
      const record = await tx.user.update({
        where: { id: user.id },
        data: { preferredLanguage: dto.preferredLanguage },
        select: { id: true, preferredLanguage: true },
      });
      return record;
    });
  }

  @Get('campaigns')
  getMyCampaigns(@CurrentUser() user: AuthenticatedUser) {
    return this.campaigns.getMyCampaigns(user.id);
  }

  /**
   * "Today's assignments" (spec §16's field-app flow) spans every campaign the caller holds a
   * role in, so — like getMyCampaigns — this can't be a single CampaignScopeGuard-gated route.
   * Safe bypass: hard-filtered to `userId = caller's own id`, never client-controlled.
   */
  @Get('assignments')
  getMyAssignments(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.runWithBypass((tx) =>
      tx.userAssignment.findMany({
        where: { userId: user.id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
        orderBy: { assignmentDate: 'asc' },
        include: {
          campaign: { select: { id: true, name: true, code: true } },
          pjpRow: {
            select: {
              id: true,
              date: true,
              locationName: true,
              stateName: true,
              districtName: true,
              tehsilName: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      }),
    );
  }
}
