import { BadRequestException, Injectable } from '@nestjs/common';
import { DASHBOARD_WIDGET_KEYS, DASHBOARD_WIDGET_LABELS, DashboardWidgetKey } from '../../common/dashboard-widgets';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { DashboardService } from '../dashboard/dashboard.service';
import { ReportsService } from '../reports/reports.service';

interface WidgetPayload {
  type: 'stats' | 'table';
  stats?: { label: string; value: string | number }[];
  table?: { headers: string[]; rows: (string | number)[][] };
}

const CLOSURE_WIDGETS: DashboardWidgetKey[] = [
  'GEOGRAPHY_COVERAGE',
  'PLANNED_VS_EXECUTED',
  'KPI_ACHIEVEMENT',
  'SALES_AND_TRIALS',
  'LEADS',
  'ACTIVITY_COMPLETION',
  'EVIDENCE',
  'ROUTE_COMPLIANCE',
  'OPEN_EXCEPTIONS_BY_CATEGORY',
];
const WEEKLY_WIDGETS: DashboardWidgetKey[] = ['STATE_COMPARISON', 'TEAM_PERFORMANCE', 'DATA_QUALITY'];

// The Client Dashboard (spec §26's fourth persona, "enabled only by Impact") — an Impact admin
// picks which widgets from the validated catalog appear for a given campaign, in what order.
// Every widget re-presents data DashboardService/ReportsService already compute; this service adds
// no new aggregation, only selection and layout. See docs/ASSUMPTIONS.md A-074 for full scope.
@Injectable()
export class ClientDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
    private readonly reports: ReportsService,
  ) {}

  async getConfig(tenant: TenantContext) {
    return this.prisma.runInTenantContext(tenant.clientId, (tx) =>
      tx.dashboardWidgetConfig.findMany({
        where: { campaignId: tenant.campaignId },
        orderBy: { displayOrder: 'asc' },
      }),
    );
  }

  async setConfig(tenant: TenantContext, widgetKeys: string[]) {
    const invalid = widgetKeys.filter((k) => !(DASHBOARD_WIDGET_KEYS as readonly string[]).includes(k));
    if (invalid.length) throw new BadRequestException(`Unknown widget key(s): ${invalid.join(', ')}`);

    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      await tx.dashboardWidgetConfig.deleteMany({ where: { campaignId: tenant.campaignId } });
      if (widgetKeys.length > 0) {
        await tx.dashboardWidgetConfig.createMany({
          data: widgetKeys.map((widgetKey, i) => ({
            clientId: tenant.clientId,
            campaignId: tenant.campaignId,
            widgetKey,
            displayOrder: i,
          })),
        });
      }
      return tx.dashboardWidgetConfig.findMany({
        where: { campaignId: tenant.campaignId },
        orderBy: { displayOrder: 'asc' },
      });
    });
  }

  async render(tenant: TenantContext) {
    const config = await this.getConfig(tenant);
    if (config.length === 0) return { widgets: [] };

    const keys = new Set(config.map((c) => c.widgetKey));
    const needsSummary = keys.has('TODAY_SUMMARY');
    const needsClosure = CLOSURE_WIDGETS.some((k) => keys.has(k));
    const needsWeekly = WEEKLY_WIDGETS.some((k) => keys.has(k));

    const [summary, closure, weekly] = await Promise.all([
      needsSummary ? this.dashboard.summary(tenant) : Promise.resolve(null),
      needsClosure ? this.reports.closure(tenant) : Promise.resolve(null),
      needsWeekly ? this.reports.weekly(tenant) : Promise.resolve(null),
    ]);

    const build = (widgetKey: string): WidgetPayload | null => {
      switch (widgetKey) {
        case 'TODAY_SUMMARY':
          return (
            summary && {
              type: 'stats',
              stats: [
                { label: 'Planned', value: summary.activities.planned },
                { label: 'Started', value: summary.activities.started },
                { label: 'Completed', value: summary.activities.completed },
                { label: 'Missed', value: summary.activities.missed },
                { label: 'Delayed', value: summary.activities.delayed },
                { label: 'Attendance started', value: summary.attendance.dayStarted },
                { label: 'Attendance ended', value: summary.attendance.dayEnded },
                { label: 'Pending approvals', value: summary.pendingApprovals },
                { label: 'Pending deviations', value: summary.pendingDeviations },
                { label: 'Open exceptions', value: summary.openExceptions },
                { label: 'Offline/unsynced users', value: summary.offlineOrUnsyncedUsers },
              ],
            }
          );
        case 'GEOGRAPHY_COVERAGE':
          return (
            closure && {
              type: 'stats',
              stats: [
                { label: 'States', value: closure.geography.states },
                { label: 'Districts', value: closure.geography.districts },
                { label: 'Tehsils', value: closure.geography.tehsils },
                { label: 'Locations', value: closure.geography.locations },
              ],
            }
          );
        case 'PLANNED_VS_EXECUTED':
          return (
            closure && {
              type: 'stats',
              stats: [
                { label: 'Planned stops', value: closure.plannedVsExecuted.plannedStops },
                { label: 'Completed stops', value: closure.plannedVsExecuted.completedStops },
                { label: 'Cancelled stops', value: closure.plannedVsExecuted.cancelledStops },
                { label: 'Completion %', value: `${closure.plannedVsExecuted.completionRate}%` },
              ],
            }
          );
        case 'KPI_ACHIEVEMENT':
          return (
            closure && {
              type: 'table',
              table: {
                headers: ['KPI', 'Target', 'Actual', 'Achievement %'],
                rows: closure.kpiAchievement.map((k) => [k.label, k.targetValue, k.actualValue, k.achievementPercent ?? '—']),
              },
            }
          );
        case 'SALES_AND_TRIALS':
          return (
            closure && {
              type: 'stats',
              stats: [
                { label: 'Total units sold', value: closure.sales.totalUnitsSold },
                { label: 'Total sales amount', value: closure.sales.totalSalesAmount },
                { label: 'Total units sampled (trials)', value: closure.trials.totalUnitsSampled },
              ],
            }
          );
        case 'LEADS':
          return (
            closure && {
              type: 'table',
              table: {
                headers: ['Status', 'Count'],
                rows: [...closure.leads.byStatus.map((l) => [l.status, l.count]), ['Total', closure.leads.total]],
              },
            }
          );
        case 'ACTIVITY_COMPLETION':
          return (
            closure && {
              type: 'table',
              table: {
                headers: ['Activity Type', 'Planned', 'Completed'],
                rows: closure.activityCompletion.map((a) => [a.activityTypeName, a.planned, a.completed]),
              },
            }
          );
        case 'EVIDENCE':
          return (
            closure && {
              type: 'stats',
              stats: [
                { label: 'Total media', value: closure.evidence.totalMediaCount },
                { label: 'Photos', value: closure.evidence.photoCount },
                { label: 'Videos', value: closure.evidence.videoCount },
                { label: 'Signatures', value: closure.evidence.signatureCount },
              ],
            }
          );
        case 'ROUTE_COMPLIANCE':
          return (
            closure && {
              type: 'stats',
              stats: [
                { label: 'Total deviation requests', value: closure.routeCompliance.totalDeviationRequests },
                { label: 'Approved', value: closure.routeCompliance.approved },
                { label: 'Rejected', value: closure.routeCompliance.rejected },
                { label: 'Pending', value: closure.routeCompliance.pending },
                { label: 'Avg distance (m)', value: closure.routeCompliance.averageDistanceMeters ?? '—' },
              ],
            }
          );
        case 'OPEN_EXCEPTIONS_BY_CATEGORY':
          return (
            closure && {
              type: 'table',
              table: {
                headers: ['Category', 'Count'],
                rows: [...closure.operationalIssues.byCategory.map((i) => [i.category, i.count]), ['Total', closure.operationalIssues.totalExceptions]],
              },
            }
          );
        case 'STATE_COMPARISON':
          return (
            weekly && {
              type: 'table',
              table: {
                headers: ['State', 'Planned Stops', 'Completed Stops', 'Completion %'],
                rows: weekly.stateComparison.map((s) => [s.state, s.plannedStops, s.completedStops, s.completionRate]),
              },
            }
          );
        case 'TEAM_PERFORMANCE':
          return (
            weekly && {
              type: 'table',
              table: {
                headers: ['User', 'Assigned', 'In Progress', 'Completed', 'Cancelled', 'Completion %'],
                rows: weekly.teamPerformance.map((p) => [p.fullName, p.assigned, p.inProgress, p.completed, p.cancelled, p.completionRate]),
              },
            }
          );
        case 'DATA_QUALITY':
          return (
            weekly && {
              type: 'stats',
              stats: [
                { label: 'Completed stops', value: weekly.dataQuality.completedStops },
                { label: 'Stops with no photo evidence', value: weekly.dataQuality.stopsWithNoPhotoEvidence },
                { label: 'Stops with form submitted 24h+ late', value: weekly.dataQuality.stopsWithFormSubmittedOver24hLate },
              ],
            }
          );
        default:
          return null;
      }
    };

    const widgets = config
      .map((c) => {
        const payload = build(c.widgetKey);
        if (!payload) return null;
        return { key: c.widgetKey, label: DASHBOARD_WIDGET_LABELS[c.widgetKey as DashboardWidgetKey] ?? c.widgetKey, ...payload };
      })
      .filter((w): w is NonNullable<typeof w> => w !== null);

    return { widgets };
  }
}
