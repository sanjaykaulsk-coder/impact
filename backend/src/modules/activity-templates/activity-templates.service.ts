import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { WorkflowsService } from '../workflows/workflows.service';
import { UpsertWorkflowDto } from '../workflows/dto/upsert-workflow.dto';
import { ApplyTemplateDto } from './dto/apply-template.dto';

// The master template library (spec §9.4): "reusable templates ... editable at campaign level
// without modifying the master." Templates and their activity types carry no clientId — they're
// a platform-wide catalogue, the same posture as the Role list in WorkflowsService.
@Injectable()
export class ActivityTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflows: WorkflowsService,
  ) {}

  /** Bypass is safe here for the same reason as WorkflowsService.listRoles: ActivityTemplate and
   * ActivityType have no clientId column — this is a fixed platform catalogue, not tenant data. */
  async findAll() {
    return this.prisma.runWithBypass((tx) =>
      tx.activityTemplate.findMany({
        include: { activityType: { select: { id: true, name: true, code: true, isCustom: true } } },
        orderBy: { name: 'asc' },
      }),
    );
  }

  /**
   * "Applying" a template does two things, both idempotent — re-applying (or applying a
   * different template) replaces the campaign's single CampaignActivity and workflow rather than
   * creating a second one, the same one-campaign-activity assumption already established for
   * Workflow in Stage 3.2 (A-048): (1) sets/updates the campaign's CampaignActivity to reference
   * this template, with its own COPY of the template's defaultConfigJson — from this point on
   * that copy is independently editable and the master template is never touched; (2) generates a
   * starter Workflow from that same config via WorkflowsService.upsert, which already enforces
   * "no live activity currently mid-flight" — the natural place for that guard, not duplicated here.
   */
  async apply(tenant: TenantContext, dto: ApplyTemplateDto) {
    const template = await this.prisma.runWithBypass((tx) =>
      tx.activityTemplate.findUnique({ where: { id: dto.activityTemplateId } }),
    );
    if (!template) throw new NotFoundException('Activity template not found');

    const config = template.defaultConfigJson as unknown as Pick<UpsertWorkflowDto, 'stages'>;

    await this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const existing = await tx.campaignActivity.findFirst({ where: { campaignId: tenant.campaignId } });
      if (existing) {
        await tx.campaignActivity.update({
          where: { id: existing.id },
          data: {
            activityTemplateId: template.id,
            activityTypeId: template.activityTypeId,
            name: template.name,
            configJson: config as unknown as Prisma.InputJsonValue,
          },
        });
      } else {
        await tx.campaignActivity.create({
          data: {
            clientId: tenant.clientId,
            campaignId: tenant.campaignId,
            activityTemplateId: template.id,
            activityTypeId: template.activityTypeId,
            name: template.name,
            configJson: config as unknown as Prisma.InputJsonValue,
          },
        });
      }
    });

    return this.workflows.upsert(tenant, { name: template.name, stages: config.stages });
  }
}
