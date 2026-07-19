import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { StageInputDto, UpsertWorkflowDto } from './dto/upsert-workflow.dto';
import { computeReadiness } from './readiness';

const WORKFLOW_INCLUDE = {
  stages: {
    orderBy: { order: 'asc' as const },
    include: {
      milestones: { orderBy: { order: 'asc' as const } },
      stageAssignments: { include: { role: true } },
      stageApprovalRules: { include: { approverRole: true } },
      sopChecklistItems: { orderBy: { order: 'asc' as const } },
    },
  },
} satisfies Prisma.WorkflowInclude;

// Spec §11: configurable stages, each carrying role assignments, an approval rule, milestones
// (spec §16), and a pre-activity SOP checklist (spec §12). One workflow per campaign — a
// practical scope decision for this session (A-048): the schema allows several, but nothing in
// the field app or this builder picks between them yet, so a second workflow would be silently
// unreachable. Logged, not silently assumed.
@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Bypass is safe here: `Role` has no `clientId` column at all (organisation-level, not
   * tenant-scoped), so there's no cross-tenant data to leak — the role catalogue (name/code/
   * category only, no assignment data) is the same fixed list every campaign's builder needs to
   * populate its role-assignment and approver dropdowns. */
  async listRoles() {
    return this.prisma.runWithBypass((tx) =>
      tx.role.findMany({ select: { code: true, name: true, category: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
    );
  }

  async findOne(tenant: TenantContext) {
    return this.prisma.runInTenantContext(tenant.clientId, (tx) =>
      tx.workflow.findFirst({ where: { campaignId: tenant.campaignId }, include: WORKFLOW_INCLUDE }),
    );
  }

  private async resolveRoleId(tx: Prisma.TransactionClient, code: string): Promise<string> {
    const role = await tx.role.findUnique({ where: { code } });
    if (!role) throw new BadRequestException(`Unknown role code "${code}"`);
    return role.id;
  }

  private async validateFormVersion(tx: Prisma.TransactionClient, tenant: TenantContext, formVersionId: string) {
    const version = await tx.formVersion.findFirst({
      where: { id: formVersionId, status: 'PUBLISHED', formTemplate: { campaignId: tenant.campaignId } },
    });
    if (!version) {
      throw new BadRequestException('A milestone can only be bound to a PUBLISHED form version belonging to this campaign');
    }
  }

  private async writeStage(
    tx: Prisma.TransactionClient,
    tenant: TenantContext,
    workflowId: string,
    stage: StageInputDto,
  ) {
    const createdStage = await tx.workflowStage.create({
      data: {
        workflowId,
        name: stage.name,
        order: stage.order,
        allowIncompletePreparation: stage.allowIncompletePreparation,
      },
    });

    for (const milestone of stage.milestones) {
      if (milestone.formVersionId) {
        await this.validateFormVersion(tx, tenant, milestone.formVersionId);
      }
      await tx.milestone.create({
        data: {
          workflowStageId: createdStage.id,
          name: milestone.name,
          order: milestone.order,
          formVersionId: milestone.formVersionId,
          mandatoryPhotoCount: milestone.mandatoryPhotoCount,
          mandatoryGps: milestone.mandatoryGps,
          mandatorySignature: milestone.mandatorySignature,
          kpiKey: milestone.kpiKey,
        },
      });
    }

    for (const roleCode of stage.assignedRoleCodes ?? []) {
      const roleId = await this.resolveRoleId(tx, roleCode);
      await tx.stageAssignment.create({ data: { workflowStageId: createdStage.id, roleId } });
    }

    if (stage.requiresApproval || stage.approverRoleCode) {
      const approverRoleId = stage.approverRoleCode ? await this.resolveRoleId(tx, stage.approverRoleCode) : undefined;
      await tx.stageApprovalRule.create({
        data: { workflowStageId: createdStage.id, requiresApproval: stage.requiresApproval, approverRoleId },
      });
    }

    for (const item of stage.sopChecklistItems ?? []) {
      await tx.sopChecklistItem.create({
        data: {
          clientId: tenant.clientId,
          campaignId: tenant.campaignId,
          workflowStageId: createdStage.id,
          label: item.label,
          order: item.order,
          isMandatory: item.isMandatory,
        },
      });
    }

    return createdStage;
  }

  /**
   * Replaces the whole workflow tree in one shot (delete + recreate stages/milestones/etc.),
   * mirroring FormsService.upsertDraft's proven pattern for the same reason: a workflow builder
   * is edited as a tree, not as scattered granular endpoints, and nothing here is ever referenced
   * by field-captured data the way a PUBLISHED FormVersion is — ActivityInstance snapshots the
   * milestone/formVersion it used at creation time (via its own FK), so replacing the definition
   * going forward doesn't retroactively change history.
   */
  async upsert(tenant: TenantContext, dto: UpsertWorkflowDto) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      let workflow = await tx.workflow.findFirst({ where: { campaignId: tenant.campaignId } });
      if (workflow) {
        // Replacing stages assigns them new ids, which would silently orphan any activity
        // currently mid-flight on the old stage (its currentStageId FK is onDelete: SetNull, not
        // a hard failure — the field app would just stop finding a current milestone). Block
        // rather than silently break an in-progress field visit; a campaign still in setup (no
        // PLANNED/IN_PROGRESS activities yet) can be edited freely.
        const liveCount = await tx.activityInstance.count({
          where: { workflowId: workflow.id, status: { in: ['PLANNED', 'IN_PROGRESS'] } },
        });
        if (liveCount > 0) {
          throw new BadRequestException(
            `Cannot edit this workflow — ${liveCount} activity instance(s) are currently in progress against it. Wait for them to complete, or reassign them first.`,
          );
        }
        await tx.workflow.update({ where: { id: workflow.id }, data: { name: dto.name } });
        // Cascades: WorkflowStage -> {Milestone, StageAssignment, StageApprovalRule, SopChecklistItem -> SopChecklistResponse}.
        await tx.workflowStage.deleteMany({ where: { workflowId: workflow.id } });
      } else {
        workflow = await tx.workflow.create({
          data: { clientId: tenant.clientId, campaignId: tenant.campaignId, name: dto.name },
        });
      }

      for (const stage of dto.stages) {
        await this.writeStage(tx, tenant, workflow.id, stage);
      }

      return tx.workflow.findFirstOrThrow({ where: { id: workflow.id }, include: WORKFLOW_INCLUDE });
    });
  }

  /**
   * Readiness view (spec §12): for each of the given date's activity instances, rolls up the
   * current stage's SOP checklist responses into the five-status view Activity Spoke / Operations
   * Director look at. `date` defaults to today; instances are matched by `plannedDate`.
   */
  async readiness(tenant: TenantContext, date?: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const targetDate = date ? new Date(date) : new Date();
      const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const activities = await tx.activityInstance.findMany({
        where: { campaignId: tenant.campaignId, plannedDate: { gte: dayStart, lt: dayEnd } },
        include: {
          currentStage: { include: { sopChecklistItems: { orderBy: { order: 'asc' } } } },
          checkIns: { select: { id: true }, take: 1 },
          sopChecklistResponses: true,
          pjpRow: { select: { locationName: true } },
        },
        orderBy: { plannedDate: 'asc' },
      });

      const userIds = [...new Set(activities.map((a) => a.assignedUserId).filter((v): v is string => !!v))];
      const users = userIds.length ? await tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } }) : [];
      const userName = new Map(users.map((u) => [u.id, u.fullName]));

      return activities.map((activity) => {
        const items = activity.currentStage?.sopChecklistItems ?? [];
        const responseByItem = new Map(activity.sopChecklistResponses.map((r) => [r.sopChecklistItemId, r]));
        const itemStatuses = items.map((item) => ({
          isMandatory: item.isMandatory,
          status: responseByItem.get(item.id)?.status ?? 'PENDING',
        }));
        const result = computeReadiness(itemStatuses, activity.plannedDate, activity.checkIns.length > 0, new Date());

        return {
          activityInstanceId: activity.id,
          assignedUserName: activity.assignedUserId ? (userName.get(activity.assignedUserId) ?? 'Unassigned') : 'Unassigned',
          locationName: activity.pjpRow?.locationName ?? 'Unknown location',
          stageName: activity.currentStage?.name ?? null,
          activityStatus: activity.status,
          ...result,
          items: items.map((item) => ({
            id: item.id,
            label: item.label,
            isMandatory: item.isMandatory,
            status: responseByItem.get(item.id)?.status ?? 'PENDING',
          })),
        };
      });
    });
  }

  async delete(tenant: TenantContext) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const workflow = await tx.workflow.findFirst({ where: { campaignId: tenant.campaignId } });
      if (!workflow) throw new NotFoundException('No workflow to delete');
      await tx.workflow.delete({ where: { id: workflow.id } });
    });
  }
}
