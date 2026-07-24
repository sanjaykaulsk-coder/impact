// Standard slippy-map (XYZ/Web Mercator) tile math — the same scheme OpenStreetMap, Leaflet and
// flutter_map all use. No library needed for this; it's a handful of well-known formulas.
export function lonLatToTile(lon: number, lat: number, zoom: number): { x: number; y: number } {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x: clamp(x, 0, n - 1), y: clamp(y, 0, n - 1) };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export interface TileRef {
  z: number;
  x: number;
  y: number;
}

/**
 * Every tile covering the bounding box of `points` (with a small padding so the edge of the
 * corridor isn't cropped right at an assigned location), across the given zoom levels. Tile count
 * is intentionally bounded by the caller (see `map-corridor.service.ts`'s MAX_TILES) — this
 * function just enumerates what a full, uncapped corridor would need.
 */
export function corridorTiles(
  points: { latitude: number; longitude: number }[],
  zooms: number[],
  paddingDegrees = 0.02,
): TileRef[] {
  const minLat = Math.min(...points.map((p) => p.latitude)) - paddingDegrees;
  const maxLat = Math.max(...points.map((p) => p.latitude)) + paddingDegrees;
  const minLon = Math.min(...points.map((p) => p.longitude)) - paddingDegrees;
  const maxLon = Math.max(...points.map((p) => p.longitude)) + paddingDegrees;

  const tiles: TileRef[] = [];
  for (const z of zooms) {
    // Note: y increases southward, so the north edge (maxLat) gives the smaller y.
    const topLeft = lonLatToTile(minLon, maxLat, z);
    const bottomRight = lonLatToTile(maxLon, minLat, z);
    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      for (let y = topLeft.y; y <= bottomRight.y; y++) {
        tiles.push({ z, x, y });
      }
    }
  }
  return tiles;
}
