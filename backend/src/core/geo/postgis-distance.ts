import { Prisma } from '@prisma/client';

/**
 * Real PostGIS distance, not a hand-rolled haversine approximation (build-sequence S4.1: "PostGIS
 * tolerance checks", spec §14). ST_MakePoint/ST_SetSRID build the geography values inline from
 * plain lat/lng — this works whether or not either point has its own stored `geoPoint` column
 * (see docs/ASSUMPTIONS.md A-014 on why Prisma's query API can't construct geometries directly).
 */
export async function postgisDistanceMeters(
  tx: Prisma.TransactionClient,
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): Promise<number> {
  const rows = await tx.$queryRaw<{ distance_meters: number }[]>`
    SELECT ST_Distance(
      ST_SetSRID(ST_MakePoint(${lng1}::float8, ${lat1}::float8), 4326)::geography,
      ST_SetSRID(ST_MakePoint(${lng2}::float8, ${lat2}::float8), 4326)::geography
    ) AS distance_meters
  `;
  return rows[0].distance_meters;
}
