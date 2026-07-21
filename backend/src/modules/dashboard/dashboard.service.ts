import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { TeamDashboardService } from '../team-dashboard/team-dashboard.service';

// Same staleness window S5.1's unsyncedUsers uses (A-068) — reused here for the live-map "offline"
// status so the two features don't disagree about what "we haven't heard from this device" means.
const OFFLINE_THRESHOLD_HOURS = 2;

type LiveMapStatus = 'RED_EXCEPTION' | 'BLACK_OFFLINE' | 'GREEN_ACTIVE' | 'AMBER_DELAYED' | 'BLUE_TRAVELLING' | 'GREY_NOT_STARTED';

// Spec §28's six-state, non-colour-dependent status system. Priority order (top wins) is a
// practical reading the spec doesn't itself state — see A-070.
const STATUS_LABEL: Record<LiveMapStatus, string> = {
  RED_EXCEPTION: 'Exception',
  BLACK_OFFLINE: 'Offline / no recent location',
  GREEN_ACTIVE: 'Active / completed',
  AMBER_DELAYED: 'Delayed',
  BLUE_TRAVELLING: 'Travelling',
  GREY_NOT_STARTED: 'Not started',
};

interface DrillDownParams {
  state?: string;
  district?: string;
  tehsil?: string;
  locationName?: string;
  activityInstanceId?: string;
}

// Module 16 full (spec §§26-28), scoped to a single campaign — there is no client-wide or
// national-level guard anywhere in this codebase yet, so the cross-campaign parts of the
// Operations Director persona (national map, campaign-vs-campaign comparison) are out of scope
// this session. See docs/ASSUMPTIONS.md A-070 for the full scope decision.
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamDashboard: TeamDashboardService,
  ) {}

  private dayBounds(dateStr?: string): { start: Date; end: Date } {
    const base = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    return { start, end };
  }

  private countBy<T>(rows: T[], keyFn: (row: T) => string): { name: string; count: number }[] {
    const map = new Map<string, number>();
    for (const row of rows) {
      const key = keyFn(row);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Combined Operations + Client Servicing KPI summary for this campaign (spec §26). */
  async summary(tenant: TenantContext, dateStr?: string) {
    const { start, end } = this.dayBounds(dateStr);
    const now = new Date();

    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const [activitiesToday, pendingApprovals, pendingDeviations, openExceptions, attendanceRows, unsyncedUsers, delayedActivities] = await Promise.all([
        tx.activityInstance.findMany({
          where: { campaignId: tenant.campaignId, plannedDate: { gte: start, lt: end } },
          select: { actualStartAt: true, actualEndAt: true },
        }),
        tx.approval.count({ where: { campaignId: tenant.campaignId, status: 'PENDING' } }),
        tx.deviationRequest.count({ where: { campaignId: tenant.campaignId, status: 'PENDING' } }),
        tx.exception.count({ where: { campaignId: tenant.campaignId, status: { notIn: ['CLOSURE_APPROVED'] } } }),
        this.teamDashboard.attendance(tenant, dateStr),
        this.teamDashboard.unsyncedUsers(tenant),
        this.teamDashboard.delayedActivities(tenant, dateStr),
      ]);

      let started = 0;
      let completed = 0;
      let missed = 0;
      for (const a of activitiesToday) {
        if (a.actualEndAt) completed += 1;
        else if (a.actualStartAt) started += 1;
        // "Missed" only makes sense once the queried day has fully elapsed — for "today" this
        // never fires (nothing is missed mid-day, only delayed); for a past date it correctly
        // flags anything that never got a start at all.
        else if (now >= end) missed += 1;
      }

      return {
        date: start.toISOString().slice(0, 10),
        activities: {
          planned: activitiesToday.length,
          started,
          completed,
          missed,
          delayed: delayedActivities.length,
        },
        attendance: {
          totalMembers: attendanceRows.length,
          dayStarted: attendanceRows.filter((r) => r.dayStart).length,
          dayEnded: attendanceRows.filter((r) => r.dayEnd).length,
        },
        pendingApprovals,
        pendingDeviations,
        openExceptions,
        // Same underlying staleness signal serves both "offline users" and "unsynced reports" in
        // the spec — this codebase has no separate way to distinguish them (A-070), stated plainly
        // via this one honestly-named field rather than two numbers pretending to differ.
        offlineOrUnsyncedUsers: unsyncedUsers.length,
      };
    });
  }

  /**
   * Campaign → State → District → Tehsil → Location → Activity(+User) → Report → Evidence
   * (spec §27, narrowed to start at Campaign — see A-070). Pass increasingly specific query params
   * to descend a level; passing activityInstanceId returns that activity's full detail including
   * its reports and evidence media in one response.
   */
  async drillDown(tenant: TenantContext, params: DrillDownParams) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      if (params.activityInstanceId) {
        const instance = await tx.activityInstance.findFirst({
          where: { id: params.activityInstanceId, campaignId: tenant.campaignId },
          include: {
            pjpRow: { select: { stateName: true, districtName: true, tehsilName: true, locationName: true } },
            workflow: { select: { name: true } },
            currentStage: { select: { name: true } },
          },
        });
        if (!instance) return null;

        const [user, forms, stock, sales, evidence] = await Promise.all([
          instance.assignedUserId ? tx.user.findUnique({ where: { id: instance.assignedUserId }, select: { id: true, fullName: true } }) : Promise.resolve(null),
          tx.formResponse.findMany({ where: { activityInstanceId: instance.id }, select: { id: true, submittedAt: true, status: true } }),
          tx.stockReport.findMany({ where: { activityInstanceId: instance.id }, select: { id: true, createdAt: true } }),
          tx.salesReport.findMany({ where: { activityInstanceId: instance.id }, select: { id: true, totalValue: true, createdAt: true } }),
          tx.media.findMany({ where: { activityInstanceId: instance.id }, select: { id: true, mimeType: true, variant: true, capturedAt: true } }),
        ]);

        return {
          level: 'ACTIVITY' as const,
          activityInstance: {
            id: instance.id,
            status: instance.status,
            riskLevel: instance.riskLevel,
            plannedDate: instance.plannedDate,
            actualStartAt: instance.actualStartAt,
            actualEndAt: instance.actualEndAt,
            workflowName: instance.workflow?.name ?? null,
            currentStageName: instance.currentStage?.name ?? null,
            location: instance.pjpRow
              ? {
                  state: instance.pjpRow.stateName,
                  district: instance.pjpRow.districtName,
                  tehsil: instance.pjpRow.tehsilName,
                  name: instance.pjpRow.locationName,
                }
              : null,
          },
          user,
          reports: { forms, stock, sales },
          evidence,
        };
      }

      if (params.state && params.district && params.tehsil && params.locationName) {
        const rows = await tx.pJPRow.findMany({
          where: {
            campaignId: tenant.campaignId,
            stateName: params.state,
            districtName: params.district,
            tehsilName: params.tehsil,
            locationName: params.locationName,
          },
          select: { id: true },
        });
        const rowIds = rows.map((r) => r.id);
        const instances = rowIds.length
          ? await tx.activityInstance.findMany({
              where: { pjpRowId: { in: rowIds } },
              select: { id: true, status: true, plannedDate: true, actualStartAt: true, actualEndAt: true, assignedUserId: true },
            })
          : [];
        const userIds = [...new Set(instances.map((i) => i.assignedUserId).filter((v): v is string => !!v))];
        const users = userIds.length ? await tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } }) : [];
        const nameById = new Map(users.map((u) => [u.id, u.fullName]));

        return {
          level: 'LOCATION' as const,
          activities: instances
            .map((i) => ({ ...i, userFullName: i.assignedUserId ? (nameById.get(i.assignedUserId) ?? '(unknown)') : null }))
            .sort((a, b) => a.plannedDate.getTime() - b.plannedDate.getTime()),
        };
      }

      if (params.state && params.district && params.tehsil) {
        const rows = await tx.pJPRow.findMany({
          where: { campaignId: tenant.campaignId, stateName: params.state, districtName: params.district, tehsilName: params.tehsil },
          select: { locationName: true },
        });
        return { level: 'TEHSIL' as const, locations: this.countBy(rows, (r) => r.locationName) };
      }

      if (params.state && params.district) {
        const rows = await tx.pJPRow.findMany({
          where: { campaignId: tenant.campaignId, stateName: params.state, districtName: params.district },
          select: { tehsilName: true },
        });
        return { level: 'DISTRICT' as const, tehsils: this.countBy(rows, (r) => r.tehsilName) };
      }

      if (params.state) {
        const rows = await tx.pJPRow.findMany({ where: { campaignId: tenant.campaignId, stateName: params.state }, select: { districtName: true } });
        return { level: 'STATE' as const, districts: this.countBy(rows, (r) => r.districtName) };
      }

      const rows = await tx.pJPRow.findMany({ where: { campaignId: tenant.campaignId }, select: { stateName: true } });
      return { level: 'CAMPAIGN' as const, states: this.countBy(rows, (r) => r.stateName) };
    });
  }

  private isDelayed(
    pjpRow: { plannedStartTime: Date | null; plannedEndTime: Date | null } | null | undefined,
    instance: { actualStartAt: Date | null; actualEndAt: Date | null } | undefined,
    now: Date,
  ): boolean {
    if (!pjpRow) return false;
    if (instance?.actualEndAt) return false;
    const started = !!instance?.actualStartAt;
    if (pjpRow.plannedStartTime && !started && now > pjpRow.plannedStartTime) return true;
    if (pjpRow.plannedEndTime && now > pjpRow.plannedEndTime) return true;
    return false;
  }

  /** Live map command centre feed (spec §28) — one point per user with an assignment today. */
  async liveMap(tenant: TenantContext, dateStr?: string) {
    const { start, end } = this.dayBounds(dateStr);
    const now = new Date();
    const offlineCutoff = new Date(now.getTime() - OFFLINE_THRESHOLD_HOURS * 60 * 60 * 1000);

    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const assignments = await tx.userAssignment.findMany({
        where: { campaignId: tenant.campaignId, assignmentDate: { gte: start, lt: end }, status: { not: 'CANCELLED' } },
        include: {
          team: { select: { name: true, vehicleInfo: true } },
          pjpRow: { select: { locationName: true, stateName: true, districtName: true, tehsilName: true, latitude: true, longitude: true, plannedStartTime: true, plannedEndTime: true } },
        },
      });
      if (assignments.length === 0) return [];

      const userIds = [...new Set(assignments.map((a) => a.userId))];
      const [users, instances, gpsPoints, devices, exceptionRows] = await Promise.all([
        tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } }),
        tx.activityInstance.findMany({
          where: { campaignId: tenant.campaignId, assignedUserId: { in: userIds }, plannedDate: { gte: start, lt: end } },
          select: { id: true, assignedUserId: true, status: true, actualStartAt: true, actualEndAt: true },
        }),
        tx.gPSPoint.findMany({
          where: { campaignId: tenant.campaignId, userId: { in: userIds }, recordedAt: { gte: start } },
          orderBy: { recordedAt: 'desc' },
          select: { userId: true, latitude: true, longitude: true, recordedAt: true },
        }),
        tx.device.findMany({ where: { userId: { in: userIds } }, select: { userId: true, lastSeenAt: true } }),
        tx.exception.findMany({ where: { campaignId: tenant.campaignId, userId: { in: userIds }, status: { notIn: ['CLOSURE_APPROVED'] } }, select: { userId: true } }),
      ]);

      const nameById = new Map(users.map((u) => [u.id, u.fullName]));
      const assignmentByUser = new Map(assignments.map((a) => [a.userId, a]));

      const instanceByUser = new Map<string, (typeof instances)[number]>();
      for (const i of instances) {
        if (i.assignedUserId && !instanceByUser.has(i.assignedUserId)) instanceByUser.set(i.assignedUserId, i);
      }

      const latestGpsByUser = new Map<string, (typeof gpsPoints)[number]>();
      for (const p of gpsPoints) {
        if (!latestGpsByUser.has(p.userId)) latestGpsByUser.set(p.userId, p);
      }

      const lastSeenByUser = new Map<string, Date>();
      for (const d of devices) {
        const current = lastSeenByUser.get(d.userId);
        if (!current || d.lastSeenAt > current) lastSeenByUser.set(d.userId, d.lastSeenAt);
      }

      const exceptionUsers = new Set(exceptionRows.map((e) => e.userId).filter((v): v is string => !!v));

      const points = userIds.map((userId) => {
        const assignment = assignmentByUser.get(userId)!;
        const instance = instanceByUser.get(userId);
        const gps = latestGpsByUser.get(userId);
        const lastSeen = lastSeenByUser.get(userId) ?? gps?.recordedAt ?? null;
        const isOffline = !lastSeen || lastSeen < offlineCutoff;
        const hasException = exceptionUsers.has(userId);

        let status: LiveMapStatus;
        if (hasException) status = 'RED_EXCEPTION';
        else if (isOffline) status = 'BLACK_OFFLINE';
        else if (instance?.actualStartAt) status = 'GREEN_ACTIVE';
        else if (this.isDelayed(assignment.pjpRow, instance, now)) status = 'AMBER_DELAYED';
        else if (gps) status = 'BLUE_TRAVELLING';
        else status = 'GREY_NOT_STARTED';

        return {
          userId,
          fullName: nameById.get(userId) ?? '(unknown)',
          teamName: assignment.team?.name ?? null,
          vehicleInfo: assignment.team?.vehicleInfo ?? null,
          status,
          statusLabel: STATUS_LABEL[status],
          plannedLocation: assignment.pjpRow
            ? {
                name: assignment.pjpRow.locationName,
                state: assignment.pjpRow.stateName,
                district: assignment.pjpRow.districtName,
                tehsil: assignment.pjpRow.tehsilName,
                latitude: assignment.pjpRow.latitude,
                longitude: assignment.pjpRow.longitude,
              }
            : null,
          lastKnownLocation: gps ? { latitude: gps.latitude, longitude: gps.longitude, recordedAt: gps.recordedAt } : null,
          activityInstanceId: instance?.id ?? null,
          activityStatus: instance?.status ?? null,
        };
      });

      return points.sort((a, b) => a.fullName.localeCompare(b.fullName));
    });
  }
}
