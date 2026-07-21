import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';

// Spec §25's "team dashboard" screen, narrowed to the five things S5.1 actually names (attendance,
// unsynced users, delayed activities, team performance, reassignment — reassignment lives in
// AssignmentsService since it's an action on an existing module, not a new view). Live map,
// exceptions, WhatsApp verification and team communication are explicitly later-stage work per
// docs/architecture/09's S5.2/S5.3, not touched here.
@Injectable()
export class TeamDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private dayBounds(dateStr?: string): { start: Date; end: Date } {
    const base = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    return { start, end };
  }

  /** Every campaign member's day-start/day-end status for a given date (default today). */
  async attendance(tenant: TenantContext, dateStr?: string) {
    const { start, end } = this.dayBounds(dateStr);
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const [memberships, records] = await Promise.all([
        tx.userCampaignRole.findMany({
          where: { campaignId: tenant.campaignId, status: 'ACTIVE' },
          include: { user: { select: { id: true, fullName: true } }, role: { select: { name: true } } },
        }),
        tx.attendance.findMany({
          where: { campaignId: tenant.campaignId, checkTime: { gte: start, lt: end } },
        }),
      ]);

      const byUser = new Map<string, { dayStart?: (typeof records)[number]; dayEnd?: (typeof records)[number] }>();
      for (const r of records) {
        const bucket = byUser.get(r.userId) ?? {};
        if (r.type === 'DAY_START') bucket.dayStart = r;
        else bucket.dayEnd = r;
        byUser.set(r.userId, bucket);
      }

      // One row per user, not per role — a user can hold at most one active role per campaign in
      // this schema in practice, but de-dupe defensively rather than assume it.
      const seen = new Set<string>();
      const rows = [];
      for (const m of memberships) {
        if (seen.has(m.userId)) continue;
        seen.add(m.userId);
        const bucket = byUser.get(m.userId) ?? {};
        rows.push({
          userId: m.userId,
          fullName: m.user.fullName,
          roleName: m.role.name,
          dayStart: bucket.dayStart?.checkTime ?? null,
          dayEnd: bucket.dayEnd?.checkTime ?? null,
        });
      }
      return rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
    });
  }

  /**
   * Users with an assignment today whose most recent server-visible signal (check-in, check-out,
   * a GPS point, or an attendance mark) is older than `thresholdHours`, or entirely absent. The
   * backend has no way to see truly local-only unsynced data by definition (that's the whole point
   * of offline-first) — this is a practical proxy for "we haven't heard from this device in a
   * while," not a literal count of queued-but-unsent items, logged as an assumption (A-068).
   */
  async unsyncedUsers(tenant: TenantContext, thresholdHours = 2) {
    const { start, end } = this.dayBounds();
    const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const todaysAssignments = await tx.userAssignment.findMany({
        where: { campaignId: tenant.campaignId, assignmentDate: { gte: start, lt: end }, status: { not: 'CANCELLED' } },
      });
      const userIds = [...new Set(todaysAssignments.map((a) => a.userId))];
      if (userIds.length === 0) return [];

      const [users, checkIns, checkOuts, gpsPoints, attendances] = await Promise.all([
        tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } }),
        tx.checkIn.findMany({ where: { userId: { in: userIds }, serverTimestamp: { gte: start } }, select: { userId: true, serverTimestamp: true } }),
        tx.checkOut.findMany({ where: { userId: { in: userIds }, serverTimestamp: { gte: start } }, select: { userId: true, serverTimestamp: true } }),
        tx.gPSPoint.findMany({ where: { campaignId: tenant.campaignId, createdAt: { gte: start } }, select: { activityInstanceId: true, createdAt: true } }),
        tx.attendance.findMany({ where: { userId: { in: userIds }, campaignId: tenant.campaignId, checkTime: { gte: start } }, select: { userId: true, checkTime: true } }),
      ]);

      // GPSPoint carries no userId directly — resolve via its activity instance's assignedUserId.
      const activityIds = [...new Set(gpsPoints.map((p) => p.activityInstanceId).filter((v): v is string => !!v))];
      const activities = activityIds.length
        ? await tx.activityInstance.findMany({ where: { id: { in: activityIds } }, select: { id: true, assignedUserId: true } })
        : [];
      const userIdByActivity = new Map(activities.map((a) => [a.id, a.assignedUserId]));

      const lastSeen = new Map<string, Date>();
      const bump = (userId: string | null | undefined, at: Date) => {
        if (!userId) return;
        const current = lastSeen.get(userId);
        if (!current || at > current) lastSeen.set(userId, at);
      };
      for (const c of checkIns) bump(c.userId, c.serverTimestamp);
      for (const c of checkOuts) bump(c.userId, c.serverTimestamp);
      for (const a of attendances) bump(a.userId, a.checkTime);
      for (const p of gpsPoints) bump(userIdByActivity.get(p.activityInstanceId ?? ''), p.createdAt);

      const nameById = new Map(users.map((u) => [u.id, u.fullName]));
      return userIds
        .map((userId) => ({
          userId,
          fullName: nameById.get(userId) ?? '(unknown)',
          lastSeenAt: lastSeen.get(userId) ?? null,
        }))
        .filter((u) => !u.lastSeenAt || u.lastSeenAt < cutoff)
        .sort((a, b) => a.fullName.localeCompare(b.fullName));
    });
  }

  /**
   * Today's (or a given date's) scheduled stops that are running late against their planned
   * window: past plannedStartTime with no check-in yet, or past plannedEndTime with no check-out
   * yet. Falls back to comparing against the plan date itself when a row has no planned
   * start/end time set, the same "planned date in the past, still unresolved" reasoning
   * readiness.ts already uses for SOP checklists (a related but distinct concept).
   */
  async delayedActivities(tenant: TenantContext, dateStr?: string) {
    const { start, end } = this.dayBounds(dateStr);
    const now = new Date();

    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const rows = await tx.pJPRow.findMany({
        where: { campaignId: tenant.campaignId, date: { gte: start, lt: end }, status: 'ACTIVE' },
        include: { userAssignments: { where: { status: { not: 'CANCELLED' } } } },
      });

      const rowIds = rows.map((r) => r.id);
      const activities = rowIds.length
        ? await tx.activityInstance.findMany({ where: { pjpRowId: { in: rowIds } }, select: { pjpRowId: true, assignedUserId: true, actualStartAt: true, actualEndAt: true } })
        : [];
      const activityByRowAndUser = new Map(activities.map((a) => [`${a.pjpRowId}|${a.assignedUserId}`, a]));

      const userIds = [...new Set(rows.flatMap((r) => r.userAssignments.map((a) => a.userId)))];
      const users = userIds.length ? await tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } }) : [];
      const nameById = new Map(users.map((u) => [u.id, u.fullName]));

      const delayed: {
        pjpRowId: string;
        locationName: string;
        userId: string;
        userFullName: string;
        plannedStartTime: Date | null;
        plannedEndTime: Date | null;
        reason: string;
      }[] = [];

      for (const row of rows) {
        for (const assignment of row.userAssignments) {
          const activity = activityByRowAndUser.get(`${row.id}|${assignment.userId}`);
          const started = !!activity?.actualStartAt;
          const ended = !!activity?.actualEndAt;
          if (ended) continue;

          let reason: string | null = null;
          if (row.plannedStartTime && !started && now > row.plannedStartTime) {
            reason = 'Not checked in — past the planned start time';
          } else if (row.plannedEndTime && now > row.plannedEndTime) {
            reason = started ? 'Not checked out — past the planned end time' : 'Not checked in — past the planned end time';
          } else if (!row.plannedStartTime && !row.plannedEndTime && !started && start < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
            reason = 'Not checked in — the planned date has passed';
          }

          if (reason) {
            delayed.push({
              pjpRowId: row.id,
              locationName: row.locationName,
              userId: assignment.userId,
              userFullName: nameById.get(assignment.userId) ?? '(unknown)',
              plannedStartTime: row.plannedStartTime,
              plannedEndTime: row.plannedEndTime,
              reason,
            });
          }
        }
      }

      return delayed.sort((a, b) => a.locationName.localeCompare(b.locationName));
    });
  }

  /** Per-user rollup of assignment outcomes over a date range (default: today only). */
  async teamPerformance(tenant: TenantContext, fromStr?: string, toStr?: string) {
    const { start } = this.dayBounds(fromStr);
    const { end } = this.dayBounds(toStr ?? fromStr);

    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const assignments = await tx.userAssignment.findMany({
        where: { campaignId: tenant.campaignId, assignmentDate: { gte: start, lt: end } },
      });
      const userIds = [...new Set(assignments.map((a) => a.userId))];
      const users = userIds.length ? await tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } }) : [];
      const nameById = new Map(users.map((u) => [u.id, u.fullName]));

      const byUser = new Map<string, { assigned: number; inProgress: number; completed: number; cancelled: number }>();
      for (const a of assignments) {
        const bucket = byUser.get(a.userId) ?? { assigned: 0, inProgress: 0, completed: 0, cancelled: 0 };
        bucket.assigned += 1;
        if (a.status === 'IN_PROGRESS') bucket.inProgress += 1;
        else if (a.status === 'COMPLETED') bucket.completed += 1;
        else if (a.status === 'CANCELLED') bucket.cancelled += 1;
        byUser.set(a.userId, bucket);
      }

      return [...byUser.entries()]
        .map(([userId, stats]) => ({
          userId,
          fullName: nameById.get(userId) ?? '(unknown)',
          ...stats,
          completionRate: stats.assigned > 0 ? Math.round((stats.completed / stats.assigned) * 100) : 0,
        }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName));
    });
  }
}
