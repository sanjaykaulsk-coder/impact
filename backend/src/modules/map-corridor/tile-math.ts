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
 * Every tile covering the bounding box of `points` (with a small geographic padding so the edge of
 * the corridor isn't cropped right at an assigned location), across the given zoom levels, PLUS a
 * fixed tile margin around that box at every zoom level.
 *
 * The tile margin is not just a nicety — without it, a real phone viewport (which is several
 * tiles wide/tall on screen, plus flutter_map's own preload buffer around the visible area) needs
 * tiles well outside a single point's tight geographic bounding box. Caught this exact gap live,
 * on a real running emulator: a single-location corridor with only degree-padding produced tiles
 * at z=14 x=6032, while the phone's actual viewport requested x=12064–12068 (the z=14 equivalent
 * range) — degree padding alone left most of the visible screen uncached, rendering as blank grey
 * tiles rather than the real map. Fixed by adding a flat tile-count margin, which scales correctly
 * with zoom level (unlike a fixed degree padding, which covers a shrinking number of tiles as zoom
 * increases) and doesn't depend on guessing a phone's exact screen width in degrees at a given
 * latitude.
 *
 * Tile count is intentionally bounded by the caller (see `map-corridor.service.ts`'s MAX_TILES) —
 * this function just enumerates what a full, uncapped corridor would need.
 */
export function corridorTiles(
  points: { latitude: number; longitude: number }[],
  zooms: number[],
  paddingDegrees = 0.02,
  tileMargin = 3,
): TileRef[] {
  const minLat = Math.min(...points.map((p) => p.latitude)) - paddingDegrees;
  const maxLat = Math.max(...points.map((p) => p.latitude)) + paddingDegrees;
  const minLon = Math.min(...points.map((p) => p.longitude)) - paddingDegrees;
  const maxLon = Math.max(...points.map((p) => p.longitude)) + paddingDegrees;

  const tiles: TileRef[] = [];
  for (const z of zooms) {
    const n = Math.pow(2, z);
    // Note: y increases southward, so the north edge (maxLat) gives the smaller y.
    const topLeft = lonLatToTile(minLon, maxLat, z);
    const bottomRight = lonLatToTile(maxLon, minLat, z);
    const minX = Math.max(0, topLeft.x - tileMargin);
    const maxX = Math.min(n - 1, bottomRight.x + tileMargin);
    const minY = Math.max(0, topLeft.y - tileMargin);
    const maxY = Math.min(n - 1, bottomRight.y + tileMargin);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tiles.push({ z, x, y });
      }
    }
  }
  return tiles;
}
