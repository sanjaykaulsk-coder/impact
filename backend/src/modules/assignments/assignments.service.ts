import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../core/audit/audit.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

// Same "already has field activity in progress or completed" guard PjpService uses for its own
// edit/cancel/postpone/reassign actions — reassigning a field worker's own in-progress or finished
// visit to someone else would silently orphan whatever check-in/photos/forms already exist.
const LOCKED_INSTANCE_STATUSES = ['IN_PROGRESS', 'COMPLETED', 'CLOSED'] as const;

const ASSIGNMENT_INCLUDE = {
  team: { select: { id: true, name: true } },
  pjpRow: { select: { id: true, date: true, locationName: true, stateName: true, districtName: true } },
} satisfies Prisma.UserAssignmentInclude;

type AssignmentWithRelations = Prisma.UserAssignmentGetPayload<{ include: typeof ASSIGNMENT_INCLUDE }>;

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * UserAssignment.userId is a plain scalar FK — the schema declares no Prisma relation from
   * UserAssignment to User, so `include: { user: ... }` isn't available. Resolving names via a
   * second query (rather than adding a schema relation mid-session) keeps this change confined to
   * the assignments module.
   */
  private async attachUserNames(tx: Prisma.TransactionClient, assignments: AssignmentWithRelations[]) {
    const userIds = [...new Set(assignments.map((a) => a.userId))];
    const users = await tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } });
    const nameById = new Map(users.map((u) => [u.id, u.fullName]));
    return assignments.map((a) => ({ ...a, userFullName: nameById.get(a.userId) ?? null }));
  }

  async findAll(tenant: TenantContext) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const assignments = await tx.userAssignment.findMany({
        where: { campaignId: tenant.campaignId },
        orderBy: { assignmentDate: 'desc' },
        include: ASSIGNMENT_INCLUDE,
      });
      return this.attachUserNames(tx, assignments);
    });
  }

  /** Anyone with an active role in this campaign is a valid assignment target (spec §7). */
  async availableUsers(tenant: TenantContext) {
    const memberships = await this.prisma.runInTenantContext(tenant.clientId, (tx) =>
      tx.userCampaignRole.findMany({
        where: {
          campaignId: tenant.campaignId,
          status: 'ACTIVE',
          OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: new Date() } }],
        },
        include: { role: { select: { name: true } } },
      }),
    );
    const userIds = [...new Set(memberships.map((m) => m.userId))];
    const users = await this.prisma.runWithBypass((tx) =>
      tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } }),
    );
    const nameById = new Map(users.map((u) => [u.id, u.fullName]));
    return memberships.map((m) => ({
      userId: m.userId,
      fullName: nameById.get(m.userId) ?? '(unknown)',
      roleName: m.role.name,
    }));
  }

  /** Rows available to assign against: only from PJPs the admin has actually published. */
  async availableRows(tenant: TenantContext) {
    return this.prisma.runInTenantContext(tenant.clientId, (tx) =>
      tx.pJPRow.findMany({
        where: { campaignId: tenant.campaignId, status: 'ACTIVE', pjp: { status: 'PUBLISHED' } },
        orderBy: { date: 'asc' },
        select: { id: true, date: true, locationName: true, stateName: true, districtName: true, tehsilName: true },
      }),
    );
  }

  async create(tenant: TenantContext, dto: CreateAssignmentDto, assignedById: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const membership = await tx.userCampaignRole.findFirst({
        where: { userId: dto.userId, campaignId: tenant.campaignId, status: 'ACTIVE' },
      });
      if (!membership) throw new BadRequestException('That user does not hold an active role in this campaign');

      if (dto.pjpRowId) {
        const row = await tx.pJPRow.findFirst({ where: { id: dto.pjpRowId, campaignId: tenant.campaignId } });
        if (!row) throw new BadRequestException('PJP row not found in this campaign');
      }
      if (dto.teamId) {
        const team = await tx.team.findFirst({ where: { id: dto.teamId, campaignId: tenant.campaignId } });
        if (!team) throw new BadRequestException('Team not found in this campaign');
      }

      const created = await tx.userAssignment.create({
        data: {
          campaignId: tenant.campaignId,
          clientId: tenant.clientId,
          userId: dto.userId,
          pjpRowId: dto.pjpRowId,
          teamId: dto.teamId,
          assignedById,
          assignmentDate: new Date(dto.assignmentDate),
          status: 'ASSIGNED',
        },
        include: ASSIGNMENT_INCLUDE,
      });
      const [withName] = await this.attachUserNames(tx, [created]);
      return withName;
    });
  }

  async update(tenant: TenantContext, assignmentId: string, dto: UpdateAssignmentDto, actorUserId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const existing = await tx.userAssignment.findFirst({ where: { id: assignmentId, campaignId: tenant.campaignId } });
      if (!existing) throw new NotFoundException('Assignment not found');

      const isReassignment = dto.userId !== undefined && dto.userId !== existing.userId;

      if (isReassignment) {
        const membership = await tx.userCampaignRole.findFirst({
          where: { userId: dto.userId, campaignId: tenant.campaignId, status: 'ACTIVE' },
        });
        if (!membership) throw new BadRequestException('That user does not hold an active role in this campaign');

        if (existing.pjpRowId) {
          const lockedInstance = await tx.activityInstance.findFirst({
            where: {
              pjpRowId: existing.pjpRowId,
              assignedUserId: existing.userId,
              status: { in: [...LOCKED_INSTANCE_STATUSES] },
            },
          });
          if (lockedInstance) {
            throw new BadRequestException(
              'This assignment already has field activity in progress or completed — it can no longer be reassigned to someone else.',
            );
          }
        }
      }

      const updated = await tx.userAssignment.update({
        where: { id: assignmentId },
        data: {
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.userId !== undefined ? { userId: dto.userId } : {}),
          ...(dto.teamId !== undefined ? { teamId: dto.teamId } : {}),
        },
        include: ASSIGNMENT_INCLUDE,
      });

      if (isReassignment) {
        await this.audit.record(tx, {
          clientId: tenant.clientId,
          campaignId: tenant.campaignId,
          actorUserId,
          action: 'ASSIGNMENT_REASSIGNED',
          entityType: 'UserAssignment',
          entityId: assignmentId,
          before: { userId: existing.userId },
          after: { userId: updated.userId },
        });
      }

      const [withName] = await this.attachUserNames(tx, [updated]);
      return withName;
    });
  }
}
