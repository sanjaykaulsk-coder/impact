import { Controller, Get } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CampaignsService } from './campaigns.service';

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

  @Get('campaigns')
  getMyCampaigns(@CurrentUser() user: AuthenticatedUser) {
    return this.campaigns.getMyCampaigns(user.id);
  }
}
