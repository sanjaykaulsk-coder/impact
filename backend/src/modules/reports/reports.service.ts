import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import { KPI_KEYS, KPI_KEY_LABELS, KpiKey } from '../../common/kpi-keys';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { TeamDashboardService } from '../team-dashboard/team-dashboard.service';
import { expectedClosingStock } from './formula';

// The DFR is a rollup query over record-level data, never a separately-entered table
// (report-format-library §2): every number here is SUM(sku_movements) grouped by day/location,
// reproducible from the immutable record-level captures underneath it.
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamDashboard: TeamDashboardService,
  ) {}

  async dfr(tenant: TenantContext, from?: string, to?: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const dateFilter: Prisma.SkuMovementWhereInput = {
        campaignId: tenant.campaignId,
        ...(from || to
          ? {
              movementDate: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      };

      const [skus, sums, recordCounts] = await Promise.all([
        tx.campaignSku.findMany({
          where: { campaignId: tenant.campaignId },
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        }),
        tx.skuMovement.groupBy({
          by: ['movementDate', 'locationId', 'campaignSkuId'],
          where: { ...dateFilter, movementType: 'SOLD' },
          _sum: { quantity: true, amount: true },
        }),
        // "Outlets visited" per day/location = distinct record-level responses that day. Every
        // SKU-bound answer writes a movement row even at zero quantity, so a visit with no sales
        // still counts (see ExecutionService's movement extraction).
        tx.skuMovement.findMany({
          where: dateFilter,
          select: { movementDate: true, locationId: true, formResponseId: true },
          distinct: ['movementDate', 'locationId', 'formResponseId'],
        }),
      ]);

      const locationIds = [...new Set(sums.map((s) => s.locationId).filter((v): v is string => !!v))];
      const locations = locationIds.length
        ? await tx.location.findMany({ where: { id: { in: locationIds } }, select: { id: true, name: true } })
        : [];
      const locationName = new Map(locations.map((l) => [l.id, l.name]));

      const keyOf = (date: Date, locationId: string | null) => `${date.toISOString().slice(0, 10)}|${locationId ?? ''}`;

      const recordCountByKey = new Map<string, number>();
      for (const rc of recordCounts) {
        const key = keyOf(rc.movementDate, rc.locationId);
        recordCountByKey.set(key, (recordCountByKey.get(key) ?? 0) + 1);
      }

      interface DfrRow {
        date: string;
        locationId: string | null;
        locationName: string | null;
        recordCount: number;
        cells: Record<string, { quantity: number; amount: number }>;
        totalQuantity: number;
        totalAmount: number;
      }
      const rows = new Map<string, DfrRow>();
      for (const s of sums) {
        const key = keyOf(s.movementDate, s.locationId);
        let row = rows.get(key);
        if (!row) {
          row = {
            date: s.movementDate.toISOString().slice(0, 10),
            locationId: s.locationId,
            locationName: s.locationId ? (locationName.get(s.locationId) ?? null) : null,
            recordCount: recordCountByKey.get(key) ?? 0,
            cells: {},
            totalQuantity: 0,
            totalAmount: 0,
          };
          rows.set(key, row);
        }
        const quantity = Number(s._sum.quantity ?? 0);
        const amount = Number(s._sum.amount ?? 0);
        row.cells[s.campaignSkuId] = { quantity, amount };
        row.totalQuantity += quantity;
        row.totalAmount += amount;
      }

      const sortedRows = [...rows.values()].sort(
        (a, b) => a.date.localeCompare(b.date) || (a.locationName ?? '').localeCompare(b.locationName ?? ''),
      );

      return {
        skus: skus.map((s) => ({
          id: s.id,
          skuCode: s.skuCode,
          name: s.name,
          variantLabel: s.variantLabel,
          category: s.category,
          isActive: s.isActive,
        })),
        rows: sortedRows,
        grandTotalQuantity: sortedRows.reduce((acc, r) => acc + r.totalQuantity, 0),
        grandTotalAmount: sortedRows.reduce((acc, r) => acc + r.totalAmount, 0),
      };
    });
  }

  async stockReconciliation(tenant: TenantContext, from?: string, to?: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const [skus, sums] = await Promise.all([
        tx.campaignSku.findMany({
          where: { campaignId: tenant.campaignId },
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        }),
        tx.skuMovement.groupBy({
          by: ['campaignSkuId', 'movementType'],
          where: {
            campaignId: tenant.campaignId,
            ...(from || to
              ? {
                  movementDate: {
                    ...(from ? { gte: new Date(from) } : {}),
                    ...(to ? { lte: new Date(to) } : {}),
                  },
                }
              : {}),
          },
          _sum: { quantity: true, amount: true },
        }),
      ]);

      const bySku = new Map<string, Partial<Record<string, { quantity: number; amount: number }>>>();
      for (const s of sums) {
        const bucket = bySku.get(s.campaignSkuId) ?? {};
        bucket[s.movementType] = { quantity: Number(s._sum.quantity ?? 0), amount: Number(s._sum.amount ?? 0) };
        bySku.set(s.campaignSkuId, bucket);
      }

      return skus.map((sku) => {
        const b = bySku.get(sku.id) ?? {};
        const opening = b.OPENING_STOCK?.quantity ?? 0;
        const received = b.RECEIVED?.quantity ?? 0;
        const sold = b.SOLD?.quantity ?? 0;
        const sampled = b.SAMPLED?.quantity ?? 0;
        const damaged = b.DAMAGED?.quantity ?? 0;
        const expected = expectedClosingStock({ opening, received, sold, sampled, damaged });
        const hasActual = b.CLOSING_STOCK_ACTUAL !== undefined;
        const actual = b.CLOSING_STOCK_ACTUAL?.quantity ?? null;
        return {
          sku: { id: sku.id, skuCode: sku.skuCode, name: sku.name, variantLabel: sku.variantLabel, isActive: sku.isActive },
          openingStock: opening,
          received,
          soldQuantity: sold,
          soldAmount: b.SOLD?.amount ?? 0,
          freeSchemeQuantity: b.FREE_SCHEME?.quantity ?? 0,
          freeSchemeValue: b.FREE_SCHEME?.amount ?? 0,
          sampled,
          damaged,
          expectedClosing: expected,
          actualClosing: actual,
          mismatch: hasActual && actual !== null ? actual - expected : null,
        };
      });
    });
  }

  // Excel layout mirrors the source workbook exactly (report-format-library §1.1): one merged
  // header cell per SKU spanning its Qty/Amt. sub-columns, ending in auto-computed Total columns.
  // No new aggregation here — this walks the same rollup dfr() already returns for the web table.
  async dfrWorkbook(tenant: TenantContext, from?: string, to?: string): Promise<Buffer> {
    const report = await this.dfr(tenant, from, to);
    const skus = report.skus.filter((s) => s.isActive || report.rows.some((r) => r.cells[s.id]));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('DFR');

    const fixedCols = ['Date', 'Location', 'Records'];
    const trailingCols = ['Total Qty', 'Total Sales Amt.'];
    const headerRow1 = sheet.addRow([...fixedCols, ...skus.flatMap((s) => [s.name + (s.variantLabel ? ` (${s.variantLabel})` : ''), '']), ...trailingCols]);
    const headerRow2 = sheet.addRow([...fixedCols.map(() => ''), ...skus.flatMap(() => ['Qty', 'Amt.']), ...trailingCols.map(() => '')]);
    [headerRow1, headerRow2].forEach((row) => row.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }));

    sheet.mergeCells(1, 1, 2, 1);
    sheet.mergeCells(1, 2, 2, 2);
    sheet.mergeCells(1, 3, 2, 3);
    skus.forEach((_, i) => {
      const col = fixedCols.length + 1 + i * 2;
      sheet.mergeCells(1, col, 1, col + 1);
    });
    const totalStartCol = fixedCols.length + 1 + skus.length * 2;
    sheet.mergeCells(1, totalStartCol, 2, totalStartCol);
    sheet.mergeCells(1, totalStartCol + 1, 2, totalStartCol + 1);

    for (const row of report.rows) {
      sheet.addRow([
        row.date,
        row.locationName ?? '—',
        row.recordCount,
        ...skus.flatMap((s) => [row.cells[s.id]?.quantity ?? 0, row.cells[s.id]?.amount ?? 0]),
        row.totalQuantity,
        row.totalAmount,
      ]);
    }

    const totalRow = sheet.addRow([
      'Grand total',
      '',
      '',
      ...skus.flatMap(() => ['', '']),
      report.grandTotalQuantity,
      report.grandTotalAmount,
    ]);
    totalRow.eachCell((cell) => (cell.font = { bold: true }));

    sheet.columns.forEach((col) => (col.width = 14));
    sheet.getColumn(2).width = 24;

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async stockReconciliationWorkbook(tenant: TenantContext, from?: string, to?: string): Promise<Buffer> {
    const rows = await this.stockReconciliation(tenant, from, to);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Stock Reconciliation');

    const header = sheet.addRow([
      'SKU',
      'Opening',
      'Received',
      'Sold Qty',
      'Sold Amt.',
      'Scheme Qty',
      'Scheme Value',
      'Sampled',
      'Damaged',
      'Expected Closing',
      'Actual Closing',
      'Mismatch',
    ]);
    header.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    for (const row of rows) {
      sheet.addRow([
        row.sku.name + (row.sku.variantLabel ? ` (${row.sku.variantLabel})` : ''),
        row.openingStock,
        row.received,
        row.soldQuantity,
        row.soldAmount,
        row.freeSchemeQuantity,
        row.freeSchemeValue,
        row.sampled,
        row.damaged,
        row.expectedClosing,
        row.actualClosing ?? '—',
        row.mismatch ?? '—',
      ]);
    }

    sheet.columns.forEach((col) => (col.width = 16));
    sheet.getColumn(1).width = 26;

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // ==========================================================================
  // WEEKLY + CAMPAIGN CLOSURE (S5.4 second slice — see docs/ASSUMPTIONS.md A-072)
  // ==========================================================================

  /**
   * Actual value achieved for every campaign-scoped Target whose period overlaps [from, to] (or
   * every target, if no range is given — the campaign-closure case). Computed from the exact same
   * rollups the DFR/lead data already expose — never a second, independently-tracked number.
   */
  private async kpiAchievement(tenant: TenantContext, from?: string, to?: string) {
    const [targets, dfrReport, leadsConverted] = await Promise.all([
      this.prisma.runInTenantContext(tenant.clientId, (tx) =>
        tx.target.findMany({ where: { campaignId: tenant.campaignId, scopeType: 'CAMPAIGN' } }),
      ),
      this.dfr(tenant, from, to),
      this.prisma.runInTenantContext(tenant.clientId, (tx) =>
        tx.lead.count({
          where: {
            campaignId: tenant.campaignId,
            status: 'CONVERTED',
            ...(from || to
              ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
              : {}),
          },
        }),
      ),
    ]);

    const actuals: Record<KpiKey, number> = {
      OUTLETS_VISITED: dfrReport.rows.reduce((acc, r) => acc + r.recordCount, 0),
      UNITS_SOLD: dfrReport.grandTotalQuantity,
      SALES_AMOUNT: dfrReport.grandTotalAmount,
      LEADS_CONVERTED: leadsConverted,
    };

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    return targets
      .filter((t) => {
        if (!fromDate && !toDate) return true;
        if (t.periodStart && toDate && t.periodStart > toDate) return false;
        if (t.periodEnd && fromDate && t.periodEnd < fromDate) return false;
        return true;
      })
      .map((t) => {
        const kpiKey = t.kpiKey as KpiKey;
        const targetValue = Number(t.targetValue);
        const actualValue = KPI_KEYS.includes(kpiKey) ? actuals[kpiKey] : 0;
        return {
          kpiKey: t.kpiKey,
          label: KPI_KEY_LABELS[kpiKey] ?? t.kpiKey,
          targetValue,
          actualValue,
          achievementPercent: targetValue > 0 ? Math.round((actualValue / targetValue) * 1000) / 10 : null,
          periodStart: t.periodStart,
          periodEnd: t.periodEnd,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  /** Planned vs completed stop counts per state, within an optional date range. */
  private async stateComparison(tenant: TenantContext, from?: string, to?: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const dateFilter: Prisma.PJPRowWhereInput = from || to
        ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {};
      const rows = await tx.pJPRow.findMany({
        where: { campaignId: tenant.campaignId, ...dateFilter },
        select: { id: true, stateName: true },
      });
      const rowIds = rows.map((r) => r.id);
      const instances = rowIds.length
        ? await tx.activityInstance.findMany({ where: { pjpRowId: { in: rowIds } }, select: { pjpRowId: true, actualEndAt: true } })
        : [];
      const completedRowIds = new Set(instances.filter((i) => i.actualEndAt).map((i) => i.pjpRowId));

      const byState = new Map<string, { state: string; plannedStops: number; completedStops: number }>();
      for (const row of rows) {
        const bucket = byState.get(row.stateName) ?? { state: row.stateName, plannedStops: 0, completedStops: 0 };
        bucket.plannedStops += 1;
        if (completedRowIds.has(row.id)) bucket.completedStops += 1;
        byState.set(row.stateName, bucket);
      }

      return [...byState.values()]
        .map((b) => ({ ...b, completionRate: b.plannedStops > 0 ? Math.round((b.completedStops / b.plannedStops) * 100) : 0 }))
        .sort((a, b) => a.state.localeCompare(b.state));
    });
  }

  /**
   * Concrete, checkable data-quality signals — not a synthetic "quality score." A completed stop
   * with zero evidence media, or whose latest form was submitted more than 24h after check-out,
   * is flagged; both are real gaps a supervisor can act on, not an invented composite metric.
   */
  private async dataQuality(tenant: TenantContext, from?: string, to?: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const dateFilter: Prisma.ActivityInstanceWhereInput = from || to
        ? { plannedDate: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {};
      const completed = await tx.activityInstance.findMany({
        where: { campaignId: tenant.campaignId, ...dateFilter, actualEndAt: { not: null } },
        select: { id: true, actualEndAt: true },
      });
      const ids = completed.map((c) => c.id);

      const [mediaCounts, forms] = await Promise.all([
        ids.length
          ? tx.media.groupBy({ by: ['activityInstanceId'], where: { activityInstanceId: { in: ids } }, _count: { id: true } })
          : Promise.resolve([]),
        ids.length
          ? tx.formResponse.findMany({ where: { activityInstanceId: { in: ids } }, select: { activityInstanceId: true, submittedAt: true } })
          : Promise.resolve([]),
      ]);
      const mediaCountByActivity = new Map(mediaCounts.map((m) => [m.activityInstanceId, m._count.id]));
      const latestFormByActivity = new Map<string, Date>();
      for (const f of forms) {
        if (!f.activityInstanceId || !f.submittedAt) continue;
        const current = latestFormByActivity.get(f.activityInstanceId);
        if (!current || f.submittedAt > current) latestFormByActivity.set(f.activityInstanceId, f.submittedAt);
      }

      let stopsWithNoPhotoEvidence = 0;
      let stopsWithFormSubmittedOver24hLate = 0;
      for (const c of completed) {
        if (!mediaCountByActivity.get(c.id)) stopsWithNoPhotoEvidence += 1;
        const submittedAt = latestFormByActivity.get(c.id);
        if (c.actualEndAt && submittedAt && submittedAt.getTime() - c.actualEndAt.getTime() > 24 * 60 * 60 * 1000) {
          stopsWithFormSubmittedOver24hLate += 1;
        }
      }

      return { completedStops: completed.length, stopsWithNoPhotoEvidence, stopsWithFormSubmittedOver24hLate };
    });
  }

  /** Exception counts grouped by category (a freeform string, e.g. "STOCK_MISMATCH"). */
  private async exceptionsByCategory(tenant: TenantContext, from?: string, to?: string, recurringOnly = false) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const dateFilter: Prisma.ExceptionWhereInput = from || to
        ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {};
      const exceptions = await tx.exception.findMany({
        where: { campaignId: tenant.campaignId, ...dateFilter },
        select: { category: true },
      });
      const byCategory = new Map<string, number>();
      for (const e of exceptions) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + 1);
      let result = [...byCategory.entries()].map(([category, count]) => ({ category, count }));
      if (recurringOnly) result = result.filter((r) => r.count >= 2);
      return result.sort((a, b) => b.count - a.count);
    });
  }

  /** Resolved exceptions with a written resolution — the real "what did we do about it" record. */
  private async correctiveActions(tenant: TenantContext, from?: string, to?: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const dateFilter: Prisma.ExceptionWhereInput = from || to
        ? { resolvedAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {};
      return tx.exception.findMany({
        where: { campaignId: tenant.campaignId, status: { in: ['RESOLVED', 'CLOSURE_APPROVED'] }, resolution: { not: null }, ...dateFilter },
        select: { category: true, severity: true, resolution: true, resolvedAt: true },
        orderBy: { resolvedAt: 'desc' },
      });
    });
  }

  /**
   * Weekly report (spec §32): trends, target vs achievement, state comparison, team/supervisor
   * performance, data quality, recurring exceptions, corrective actions. `from`/`to` can be any
   * range the founder picks on the Reports page — this codebase has no fixed Mon-Sun week concept
   * anywhere, so a strict calendar-week boundary isn't assumed (docs/ASSUMPTIONS.md A-072).
   */
  async weekly(tenant: TenantContext, from?: string, to?: string) {
    const [dfrReport, kpiAchievement, teamPerformance, stateComparison, dataQuality, recurringExceptions, correctiveActions] =
      await Promise.all([
        this.dfr(tenant, from, to),
        this.kpiAchievement(tenant, from, to),
        this.teamDashboard.teamPerformance(tenant, from, to),
        this.stateComparison(tenant, from, to),
        this.dataQuality(tenant, from, to),
        this.exceptionsByCategory(tenant, from, to, true),
        this.correctiveActions(tenant, from, to),
      ]);

    const byDate = new Map<string, { date: string; outletsVisited: number; unitsSold: number; salesAmount: number }>();
    for (const row of dfrReport.rows) {
      const bucket = byDate.get(row.date) ?? { date: row.date, outletsVisited: 0, unitsSold: 0, salesAmount: 0 };
      bucket.outletsVisited += row.recordCount;
      bucket.unitsSold += row.totalQuantity;
      bucket.salesAmount += row.totalAmount;
      byDate.set(row.date, bucket);
    }
    const trends = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

    return {
      period: { from: from ?? null, to: to ?? null },
      trends,
      kpiAchievement,
      stateComparison,
      teamPerformance,
      dataQuality,
      recurringExceptions,
      correctiveActions,
    };
  }

  /**
   * Campaign closure report (spec §32): overview, geography, planned vs executed, KPI achievement,
   * sales, trials, leads, installations, evidence, route compliance, operational issues, learnings
   * and recommendations. Spans the campaign's full lifetime — no date range.
   */
  async closure(tenant: TenantContext) {
    const [campaign, geography, plannedVsExecuted, kpiAchievement, dfrReport, stockRows, leadsByStatus, activityCompletion, evidence, routeCompliance, operationalIssues] =
      await Promise.all([
        this.prisma.runInTenantContext(tenant.clientId, (tx) =>
          tx.campaign.findUnique({
            where: { id: tenant.campaignId },
            select: { name: true, status: true, startDate: true, endDate: true, client: { select: { name: true } } },
          }),
        ),
        this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
          const rows = await tx.pJPRow.findMany({
            where: { campaignId: tenant.campaignId },
            select: { stateName: true, districtName: true, tehsilName: true, locationName: true },
          });
          return {
            states: new Set(rows.map((r) => r.stateName)).size,
            districts: new Set(rows.map((r) => `${r.stateName}|${r.districtName}`)).size,
            tehsils: new Set(rows.map((r) => `${r.stateName}|${r.districtName}|${r.tehsilName}`)).size,
            locations: new Set(rows.map((r) => `${r.stateName}|${r.districtName}|${r.tehsilName}|${r.locationName}`)).size,
          };
        }),
        this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
          const rows = await tx.pJPRow.findMany({ where: { campaignId: tenant.campaignId }, select: { id: true, status: true } });
          const rowIds = rows.map((r) => r.id);
          const instances = rowIds.length
            ? await tx.activityInstance.findMany({ where: { pjpRowId: { in: rowIds } }, select: { pjpRowId: true, actualEndAt: true } })
            : [];
          const completedRowIds = new Set(instances.filter((i) => i.actualEndAt).map((i) => i.pjpRowId));
          const plannedStops = rows.length;
          const completedStops = completedRowIds.size;
          return {
            plannedStops,
            completedStops,
            cancelledStops: rows.filter((r) => r.status === 'CANCELLED').length,
            completionRate: plannedStops > 0 ? Math.round((completedStops / plannedStops) * 100) : 0,
          };
        }),
        this.kpiAchievement(tenant),
        this.dfr(tenant),
        this.stockReconciliation(tenant),
        this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
          const leads = await tx.lead.findMany({ where: { campaignId: tenant.campaignId }, select: { status: true } });
          const byStatus = new Map<string, number>();
          for (const l of leads) byStatus.set(l.status, (byStatus.get(l.status) ?? 0) + 1);
          return { total: leads.length, byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })) };
        }),
        this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
          const instances = await tx.activityInstance.findMany({
            where: { campaignId: tenant.campaignId },
            select: { actualEndAt: true, campaignActivity: { select: { activityType: { select: { name: true } } } } },
          });
          const byType = new Map<string, { planned: number; completed: number }>();
          for (const i of instances) {
            const name = i.campaignActivity.activityType.name;
            const bucket = byType.get(name) ?? { planned: 0, completed: 0 };
            bucket.planned += 1;
            if (i.actualEndAt) bucket.completed += 1;
            byType.set(name, bucket);
          }
          return [...byType.entries()]
            .map(([activityTypeName, b]) => ({ activityTypeName, ...b }))
            .sort((a, b) => a.activityTypeName.localeCompare(b.activityTypeName));
        }),
        this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
          const [media, signatures] = await Promise.all([
            tx.media.findMany({ where: { campaignId: tenant.campaignId }, select: { mimeType: true } }),
            tx.signature.count({ where: { activityInstance: { campaignId: tenant.campaignId } } }),
          ]);
          const photoCount = media.filter((m) => m.mimeType.startsWith('image/')).length;
          const videoCount = media.filter((m) => m.mimeType.startsWith('video/')).length;
          return { totalMediaCount: media.length, photoCount, videoCount, signatureCount: signatures };
        }),
        this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
          const deviations = await tx.deviationRequest.findMany({
            where: { campaignId: tenant.campaignId },
            select: { status: true, distanceMeters: true },
          });
          const withDistance = deviations.filter((d) => d.distanceMeters !== null);
          const averageDistanceMeters = withDistance.length
            ? Math.round(withDistance.reduce((acc, d) => acc + Number(d.distanceMeters), 0) / withDistance.length)
            : null;
          return {
            totalDeviationRequests: deviations.length,
            approved: deviations.filter((d) => d.status === 'APPROVED').length,
            rejected: deviations.filter((d) => d.status === 'REJECTED').length,
            pending: deviations.filter((d) => d.status === 'PENDING').length,
            averageDistanceMeters,
          };
        }),
        this.exceptionsByCategory(tenant),
      ]);

    const totalExceptions = operationalIssues.reduce((acc, e) => acc + e.count, 0);

    return {
      overview: campaign
        ? {
            campaignName: campaign.name,
            clientName: campaign.client.name,
            status: campaign.status,
            startDate: campaign.startDate,
            endDate: campaign.endDate,
          }
        : null,
      geography,
      plannedVsExecuted,
      kpiAchievement,
      sales: { totalUnitsSold: dfrReport.grandTotalQuantity, totalSalesAmount: dfrReport.grandTotalAmount },
      // "Trials" (report-format-library §3's SAMPLED_QTY movement type — units given out for
      // sampling, not sold) summed straight from the same stock-reconciliation rollup already built.
      trials: { totalUnitsSampled: stockRows.reduce((acc, r) => acc + r.sampled, 0) },
      leads: leadsByStatus,
      // "Installations" (spec §32) has no dedicated entity anywhere in this schema — different
      // client campaigns mean different things by it (a branding install, a stall setup, a demo).
      // Shown as completion-by-activity-type instead, which is real and campaign-agnostic, rather
      // than inventing a client-specific "installation" concept (CLAUDE.md: never hard-code an
      // individual client's workflow). See docs/ASSUMPTIONS.md A-072.
      activityCompletion,
      evidence,
      routeCompliance,
      operationalIssues: { totalExceptions, byCategory: operationalIssues },
      // Inherently qualitative — no system-computed substitute is honest here. Left blank in both
      // the JSON and the Excel export for a human to fill in, the same "real gap, not invented
      // content" discipline as every other honestly-stated limitation in this project.
      learningsAndRecommendations: null as string | null,
    };
  }

  async weeklyWorkbook(tenant: TenantContext, from?: string, to?: string): Promise<Buffer> {
    const report = await this.weekly(tenant, from, to);
    const workbook = new ExcelJS.Workbook();

    const boldHeader = (row: ExcelJS.Row) => row.eachCell((cell) => (cell.font = { bold: true }));

    const trendsSheet = workbook.addWorksheet('Trends');
    boldHeader(trendsSheet.addRow(['Date', 'Outlets Visited', 'Units Sold', 'Sales Amount']));
    for (const t of report.trends) trendsSheet.addRow([t.date, t.outletsVisited, t.unitsSold, t.salesAmount]);
    trendsSheet.columns.forEach((c) => (c.width = 18));

    const kpiSheet = workbook.addWorksheet('Target vs Achievement');
    boldHeader(kpiSheet.addRow(['KPI', 'Target', 'Actual', 'Achievement %', 'Period Start', 'Period End']));
    for (const k of report.kpiAchievement) {
      kpiSheet.addRow([k.label, k.targetValue, k.actualValue, k.achievementPercent ?? '—', k.periodStart ?? '—', k.periodEnd ?? '—']);
    }
    kpiSheet.columns.forEach((c) => (c.width = 18));

    const stateSheet = workbook.addWorksheet('State Comparison');
    boldHeader(stateSheet.addRow(['State', 'Planned Stops', 'Completed Stops', 'Completion Rate %']));
    for (const s of report.stateComparison) stateSheet.addRow([s.state, s.plannedStops, s.completedStops, s.completionRate]);
    stateSheet.columns.forEach((c) => (c.width = 18));

    const teamSheet = workbook.addWorksheet('Team Performance');
    boldHeader(teamSheet.addRow(['User', 'Assigned', 'In Progress', 'Completed', 'Cancelled', 'Completion Rate %']));
    for (const p of report.teamPerformance) {
      teamSheet.addRow([p.fullName, p.assigned, p.inProgress, p.completed, p.cancelled, p.completionRate]);
    }
    teamSheet.columns.forEach((c) => (c.width = 18));

    const dqSheet = workbook.addWorksheet('Data Quality');
    boldHeader(dqSheet.addRow(['Metric', 'Value']));
    dqSheet.addRow(['Completed stops', report.dataQuality.completedStops]);
    dqSheet.addRow(['Stops with no photo evidence', report.dataQuality.stopsWithNoPhotoEvidence]);
    dqSheet.addRow(['Stops with form submitted 24h+ late', report.dataQuality.stopsWithFormSubmittedOver24hLate]);
    dqSheet.columns.forEach((c) => (c.width = 32));

    const exSheet = workbook.addWorksheet('Recurring Exceptions');
    boldHeader(exSheet.addRow(['Category', 'Count']));
    for (const e of report.recurringExceptions) exSheet.addRow([e.category, e.count]);
    exSheet.columns.forEach((c) => (c.width = 24));

    const caSheet = workbook.addWorksheet('Corrective Actions');
    boldHeader(caSheet.addRow(['Category', 'Severity', 'Resolution', 'Resolved At']));
    for (const c of report.correctiveActions) caSheet.addRow([c.category, c.severity, c.resolution ?? '', c.resolvedAt ?? '']);
    caSheet.columns.forEach((c) => (c.width = 28));

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async closureWorkbook(tenant: TenantContext): Promise<Buffer> {
    const report = await this.closure(tenant);
    const workbook = new ExcelJS.Workbook();
    const boldHeader = (row: ExcelJS.Row) => row.eachCell((cell) => (cell.font = { bold: true }));

    const overviewSheet = workbook.addWorksheet('Overview');
    overviewSheet.addRow(['Campaign', report.overview?.campaignName ?? '—']);
    overviewSheet.addRow(['Client', report.overview?.clientName ?? '—']);
    overviewSheet.addRow(['Status', report.overview?.status ?? '—']);
    overviewSheet.addRow(['Start date', report.overview?.startDate ?? '—']);
    overviewSheet.addRow(['End date', report.overview?.endDate ?? '—']);
    overviewSheet.getColumn(1).width = 20;
    overviewSheet.getColumn(2).width = 30;

    const geoSheet = workbook.addWorksheet('Geography');
    boldHeader(geoSheet.addRow(['States', 'Districts', 'Tehsils', 'Locations']));
    geoSheet.addRow([report.geography.states, report.geography.districts, report.geography.tehsils, report.geography.locations]);
    geoSheet.columns.forEach((c) => (c.width = 16));

    const pveSheet = workbook.addWorksheet('Planned vs Executed');
    boldHeader(pveSheet.addRow(['Planned Stops', 'Completed Stops', 'Cancelled Stops', 'Completion Rate %']));
    pveSheet.addRow([report.plannedVsExecuted.plannedStops, report.plannedVsExecuted.completedStops, report.plannedVsExecuted.cancelledStops, report.plannedVsExecuted.completionRate]);
    pveSheet.columns.forEach((c) => (c.width = 18));

    const kpiSheet = workbook.addWorksheet('KPI Achievement');
    boldHeader(kpiSheet.addRow(['KPI', 'Target', 'Actual', 'Achievement %']));
    for (const k of report.kpiAchievement) kpiSheet.addRow([k.label, k.targetValue, k.actualValue, k.achievementPercent ?? '—']);
    kpiSheet.columns.forEach((c) => (c.width = 18));

    const salesSheet = workbook.addWorksheet('Sales & Trials');
    boldHeader(salesSheet.addRow(['Metric', 'Value']));
    salesSheet.addRow(['Total units sold', report.sales.totalUnitsSold]);
    salesSheet.addRow(['Total sales amount', report.sales.totalSalesAmount]);
    salesSheet.addRow(['Total units sampled (trials)', report.trials.totalUnitsSampled]);
    salesSheet.columns.forEach((c) => (c.width = 28));

    const leadsSheet = workbook.addWorksheet('Leads');
    boldHeader(leadsSheet.addRow(['Status', 'Count']));
    for (const l of report.leads.byStatus) leadsSheet.addRow([l.status, l.count]);
    leadsSheet.addRow(['Total', report.leads.total]);
    leadsSheet.columns.forEach((c) => (c.width = 18));

    const activitySheet = workbook.addWorksheet('Activity Completion');
    boldHeader(activitySheet.addRow(['Activity Type', 'Planned', 'Completed']));
    for (const a of report.activityCompletion) activitySheet.addRow([a.activityTypeName, a.planned, a.completed]);
    activitySheet.columns.forEach((c) => (c.width = 24));

    const evidenceSheet = workbook.addWorksheet('Evidence');
    boldHeader(evidenceSheet.addRow(['Metric', 'Value']));
    evidenceSheet.addRow(['Total media', report.evidence.totalMediaCount]);
    evidenceSheet.addRow(['Photos', report.evidence.photoCount]);
    evidenceSheet.addRow(['Videos', report.evidence.videoCount]);
    evidenceSheet.addRow(['Signatures', report.evidence.signatureCount]);
    evidenceSheet.columns.forEach((c) => (c.width = 18));

    const routeSheet = workbook.addWorksheet('Route Compliance');
    boldHeader(routeSheet.addRow(['Total Deviation Requests', 'Approved', 'Rejected', 'Pending', 'Avg Distance (m)']));
    routeSheet.addRow([
      report.routeCompliance.totalDeviationRequests,
      report.routeCompliance.approved,
      report.routeCompliance.rejected,
      report.routeCompliance.pending,
      report.routeCompliance.averageDistanceMeters ?? '—',
    ]);
    routeSheet.columns.forEach((c) => (c.width = 20));

    const issuesSheet = workbook.addWorksheet('Operational Issues');
    boldHeader(issuesSheet.addRow(['Category', 'Count']));
    for (const i of report.operationalIssues.byCategory) issuesSheet.addRow([i.category, i.count]);
    issuesSheet.addRow(['Total', report.operationalIssues.totalExceptions]);
    issuesSheet.columns.forEach((c) => (c.width = 24));

    const learningsSheet = workbook.addWorksheet('Learnings & Recommendations');
    learningsSheet.addRow(['This section is intentionally left blank for your team to fill in by hand.']);
    learningsSheet.addRow(['Learnings:']);
    learningsSheet.addRow(['']);
    learningsSheet.addRow(['Recommendations:']);
    learningsSheet.addRow(['']);
    learningsSheet.getColumn(1).width = 80;

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
