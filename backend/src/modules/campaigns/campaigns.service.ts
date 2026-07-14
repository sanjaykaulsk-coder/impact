import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Campaign selection screen (spec §15): every campaign the caller currently holds an active
   * role in, possibly spanning multiple clients (spec §7 — "different roles in different
   * campaigns"). RLS bypass here is safe: hard-filtered to `userId = caller's own id`, which is
   * never client-controlled, so this can only ever return the caller's own memberships.
   */
  async getMyCampaigns(userId: string) {
    const memberships = await this.prisma.runWithBypass((tx) =>
      tx.userCampaignRole.findMany({
        where: {
          userId,
          status: 'ACTIVE',
          OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: new Date() } }],
        },
        include: {
          campaign: { include: { client: true, branding: true } },
          role: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    );

    return memberships.map((m) => ({
      campaignId: m.campaignId,
      campaignName: m.campaign.name,
      campaignStatus: m.campaign.status,
      clientId: m.clientId,
      clientName: m.campaign.client.name,
      clientLogoUrl: m.campaign.client.logoUrl,
      roleId: m.roleId,
      roleName: m.role.name,
      roleCode: m.role.code,
      brandingSummary: m.campaign.branding
        ? { logoUrl: m.campaign.branding.logoUrl, primaryColor: m.campaign.branding.themeJson }
        : null,
    }));
  }

  /**
   * The branding document the field app renders its campaign-home screen from (spec §6): logo,
   * colours, banner, instructions, escalation contacts. Runs inside the caller's own tenant
   * context — CampaignScopeGuard has already confirmed the caller holds an active role here.
   */
  async getBranding(tenant: TenantContext) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const branding = await tx.campaignBranding.findUnique({
        where: { campaignId: tenant.campaignId },
        include: { campaign: { include: { client: true } } },
      });
      if (!branding) throw new NotFoundException('This campaign has no published branding yet');
      return {
        campaignId: branding.campaignId,
        campaignName: branding.campaign.name,
        clientName: branding.campaign.client.name,
        version: branding.version,
        theme: branding.themeJson,
        logoUrl: branding.logoUrl,
        campaignLogoUrl: branding.campaignLogoUrl,
        homeBannerUrl: branding.homeBannerUrl,
        instructionsText: branding.instructionsText,
        escalationContactName: branding.escalationContactName,
        escalationContactPhone: branding.escalationContactPhone,
      };
    });
  }
}
