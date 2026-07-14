import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CampaignStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { UpsertBrandingDto } from './dto/upsert-branding.dto';

// Linear lifecycle per spec §9.2, with a "send back to configuration" escape hatch from the two
// review gates (READY_FOR_REVIEW, APPROVED) and a pause/resume loop once live. ARCHIVED is terminal.
const CAMPAIGN_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ['CONFIGURATION_IN_PROGRESS'],
  CONFIGURATION_IN_PROGRESS: ['READY_FOR_REVIEW'],
  READY_FOR_REVIEW: ['APPROVED', 'CONFIGURATION_IN_PROGRESS'],
  APPROVED: ['PUBLISHED', 'CONFIGURATION_IN_PROGRESS'],
  PUBLISHED: ['LIVE'],
  LIVE: ['PAUSED', 'COMPLETED'],
  PAUSED: ['LIVE', 'COMPLETED'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [],
};

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Platform-wide campaign list for the builder screen (spec §9.2) — gated by
   * PlatformPermissionGuard at the route, not RLS, since an admin building campaigns needs to see
   * across every client. Same justification as ClientsService.
   */
  async findAll() {
    return this.prisma.runWithBypass((tx) =>
      tx.campaign.findMany({
        orderBy: { createdAt: 'desc' },
        include: { client: { select: { id: true, name: true, code: true } } },
      }),
    );
  }

  /**
   * A brand-new campaign has no UserCampaignRole rows yet, so without this the creator — who may
   * hold no *other* role on this client — would be immediately locked out of the campaign they
   * just created by CampaignScopeGuard. We carry over one of their existing roles that already
   * grants `edit` (the same permission PlatformPermissionGuard required to reach this method),
   * preferring a role already scoped to this campaign's client, onto the new campaign. This is
   * the same seed-time workaround pattern as A-017, applied at creation time.
   */
  async create(dto: CreateCampaignDto, creatorUserId: string) {
    return this.prisma.runWithBypass(async (tx) => {
      const client = await tx.client.findUnique({ where: { id: dto.clientId } });
      if (!client) throw new BadRequestException('Client not found');

      const existing = await tx.campaign.findUnique({ where: { code: dto.code } });
      if (existing) throw new ConflictException(`Campaign code "${dto.code}" is already in use`);

      const campaign = await tx.campaign.create({
        data: {
          clientId: dto.clientId,
          name: dto.name,
          code: dto.code,
          reportingLanguage: dto.reportingLanguage ?? 'EN',
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          deviationToleranceMeters: dto.deviationToleranceMeters ?? 250,
        },
      });

      const creatorMemberships = await tx.userCampaignRole.findMany({
        where: { userId: creatorUserId, status: 'ACTIVE' },
        include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
      });
      const creatableRoles = creatorMemberships.filter((m) =>
        m.role.rolePermissions.some((rp) => rp.permission.code === 'edit'),
      );
      const grantRole =
        creatableRoles.find((m) => m.clientId === dto.clientId) ?? creatableRoles[0] ?? creatorMemberships[0];
      if (grantRole) {
        await tx.userCampaignRole.create({
          data: {
            userId: creatorUserId,
            campaignId: campaign.id,
            clientId: dto.clientId,
            roleId: grantRole.roleId,
            status: 'ACTIVE',
          },
        });
      }

      return campaign;
    });
  }

  async findOne(tenant: TenantContext) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const campaign = await tx.campaign.findUnique({
        where: { id: tenant.campaignId },
        include: { client: { select: { id: true, name: true, code: true } } },
      });
      if (!campaign) throw new NotFoundException('Campaign not found');
      return campaign;
    });
  }

  async update(tenant: TenantContext, dto: UpdateCampaignDto) {
    return this.prisma.runInTenantContext(tenant.clientId, (tx) =>
      tx.campaign.update({
        where: { id: tenant.campaignId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.reportingLanguage !== undefined ? { reportingLanguage: dto.reportingLanguage } : {}),
          ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
          ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
          ...(dto.deviationToleranceMeters !== undefined
            ? { deviationToleranceMeters: dto.deviationToleranceMeters }
            : {}),
        },
      }),
    );
  }

  /**
   * Status transitions (spec §9.2's Draft→...→Archived chain). Moving *into* APPROVED is a
   * separation-of-duties gate — it requires the `approve` permission, not just `edit`, matching
   * how the role seed splits those two codes across roles (e.g. Campaign Manager has `edit` but
   * not `approve`; Operations Director has both).
   */
  async transition(tenant: TenantContext, toStatus: CampaignStatus) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const campaign = await tx.campaign.findUnique({ where: { id: tenant.campaignId } });
      if (!campaign) throw new NotFoundException('Campaign not found');

      const allowed = CAMPAIGN_TRANSITIONS[campaign.status];
      if (!allowed.includes(toStatus)) {
        throw new BadRequestException(`Cannot move campaign from ${campaign.status} to ${toStatus}`);
      }
      if (toStatus === 'APPROVED' && !tenant.permissions.includes('approve')) {
        throw new ForbiddenException('Missing required permission(s): approve');
      }

      return tx.campaign.update({ where: { id: tenant.campaignId }, data: { status: toStatus } });
    });
  }

  async upsertBranding(tenant: TenantContext, dto: UpsertBrandingDto) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const existing = await tx.campaignBranding.findUnique({ where: { campaignId: tenant.campaignId } });
      const themeJson = { primaryColor: dto.primaryColor, secondaryColor: dto.secondaryColor, mode: 'branded' };

      return tx.campaignBranding.upsert({
        where: { campaignId: tenant.campaignId },
        update: {
          version: (existing?.version ?? 0) + 1,
          themeJson,
          logoUrl: dto.logoUrl,
          campaignLogoUrl: dto.campaignLogoUrl,
          homeBannerUrl: dto.homeBannerUrl,
          instructionsText: dto.instructionsText,
          escalationContactName: dto.escalationContactName,
          escalationContactPhone: dto.escalationContactPhone,
          publishedAt: new Date(),
        },
        create: {
          campaignId: tenant.campaignId,
          clientId: tenant.clientId,
          version: 1,
          themeJson,
          logoUrl: dto.logoUrl,
          campaignLogoUrl: dto.campaignLogoUrl,
          homeBannerUrl: dto.homeBannerUrl,
          instructionsText: dto.instructionsText,
          escalationContactName: dto.escalationContactName,
          escalationContactPhone: dto.escalationContactPhone,
          publishedAt: new Date(),
        },
      });
    });
  }

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
