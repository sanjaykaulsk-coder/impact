import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { expectedClosingStock } from './formula';

// The DFR is a rollup query over record-level data, never a separately-entered table
// (report-format-library §2): every number here is SUM(sku_movements) grouped by day/location,
// reproducible from the immutable record-level captures underneath it.
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
