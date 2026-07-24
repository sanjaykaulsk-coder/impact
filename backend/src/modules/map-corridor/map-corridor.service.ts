import { Injectable } from '@nestjs/common';
import { MapTileService } from '../../core/storage/map-tile.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { corridorTiles, TileRef } from './tile-math';

// Zoom 13–15 covers "town/tehsil level down to individual streets" — enough to navigate a day's
// route without needing building-level detail (which would multiply the tile count ~4x per extra
// zoom level for no real field-use benefit). A wider zoom range is a config knob to revisit if the
// founder finds it too coarse/fine in practice — not something worth guessing further on paper.
const ZOOM_LEVELS = [13, 14, 15];
// Matches docs/architecture/08's "~50MB per corridor" cap (real OSM tiles run ~10–25KB each, so
// ~600 tiles keeps a corridor comfortably under that even at the high end).
const MAX_TILES = 600;
const TILE_FETCH_BATCH_SIZE = 8;

@Injectable()
export class MapCorridorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapTiles: MapTileService,
  ) {}

  private dayBounds(dateStr?: string): { start: Date; end: Date } {
    const base = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    return { start, end };
  }

  async getCorridor(tenant: TenantContext, userId: string, dateStr?: string) {
    const { start, end } = this.dayBounds(dateStr);

    const { locations, tileRefs } = await this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const assignments = await tx.userAssignment.findMany({
        where: { campaignId: tenant.campaignId, userId, assignmentDate: { gte: start, lt: end }, status: { not: 'CANCELLED' } },
        include: {
          pjpRow: {
            select: { id: true, locationName: true, latitude: true, longitude: true, plannedSequence: true },
          },
        },
      });

      const rowIds = assignments.map((a) => a.pjpRow?.id).filter((id): id is string => !!id);
      const instances = rowIds.length
        ? await tx.activityInstance.findMany({
            where: { pjpRowId: { in: rowIds }, assignedUserId: userId },
            select: { pjpRowId: true, actualStartAt: true, actualEndAt: true },
          })
        : [];
      const instanceByRow = new Map(instances.map((i) => [i.pjpRowId, i]));

      const withCoords = assignments
        .filter((a) => a.pjpRow?.latitude !== null && a.pjpRow?.latitude !== undefined && a.pjpRow?.longitude !== null && a.pjpRow?.longitude !== undefined)
        .map((a) => {
          const instance = a.pjpRow ? instanceByRow.get(a.pjpRow.id) : undefined;
          const status = instance?.actualEndAt ? 'COMPLETED' : instance?.actualStartAt ? 'IN_PROGRESS' : 'PENDING';
          return {
            locationName: a.pjpRow!.locationName,
            latitude: Number(a.pjpRow!.latitude),
            longitude: Number(a.pjpRow!.longitude),
            plannedSequence: a.pjpRow!.plannedSequence,
            status,
          };
        })
        .sort((a, b) => (a.plannedSequence ?? 0) - (b.plannedSequence ?? 0));

      if (withCoords.length === 0) return { locations: [], tileRefs: [] as TileRef[] };

      let tiles = corridorTiles(withCoords, ZOOM_LEVELS);
      // Degrade gracefully rather than silently truncating an arbitrary slice: drop the finest
      // zoom level first (it always has the most tiles), then the next, until under the cap.
      const zoomsDescending = [...ZOOM_LEVELS].sort((a, b) => b - a);
      let remainingZooms = [...ZOOM_LEVELS];
      for (const z of zoomsDescending) {
        if (tiles.length <= MAX_TILES) break;
        remainingZooms = remainingZooms.filter((zoom) => zoom !== z);
        tiles = corridorTiles(withCoords, remainingZooms);
      }

      return { locations: withCoords, tileRefs: tiles };
    });

    if (locations.length === 0) {
      return { locations: [], tiles: [], tileCount: 0 };
    }

    // Fetch-and-cache in small concurrent batches — polite to OSM's server, not a 600-way stampede.
    for (let i = 0; i < tileRefs.length; i += TILE_FETCH_BATCH_SIZE) {
      const batch = tileRefs.slice(i, i + TILE_FETCH_BATCH_SIZE);
      await Promise.all(batch.map((t) => this.mapTiles.ensureTileCached(t.z, t.x, t.y)));
    }

    const tiles = await Promise.all(
      tileRefs.map(async (t) => ({ z: t.z, x: t.x, y: t.y, url: await this.mapTiles.getSignedTileUrl(t.z, t.x, t.y) })),
    );

    return { locations, tiles, tileCount: tiles.length };
  }
}
