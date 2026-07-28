import { Injectable, Logger } from '@nestjs/common';

// PJP location entry — "suggest lat/long" (founder request). OpenStreetMap's free Nominatim
// search API, same OSM-usage-policy posture already established for map tiles
// (core/storage/map-tile.service.ts): a real, honest User-Agent, and this is only ever called
// from one manually-clicked admin button (never a batch/automated loop), well within Nominatim's
// "no heavy automated use" policy. No API key, no paid credential — a genuine geocoding lookup,
// not a mocked placeholder.
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'ImpactFieldCommand/0.1 (dev/prototype build; contact: founder via app)';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  /** Best-effort geocoding of a plain-language Indian address fragment. Returns null (never
   * throws) on no match or any network/parse failure — this is a suggestion the admin reviews
   * and can always fill in by hand, never a hard dependency. */
  async geocode(parts: { locationName?: string; tehsilName?: string; districtName?: string; stateName?: string }): Promise<GeocodeResult | null> {
    const query = [parts.locationName, parts.tehsilName, parts.districtName, parts.stateName, 'India']
      .filter((p): p is string => !!p && p.trim().length > 0)
      .join(', ');
    if (!query) return null;

    try {
      const url = `${NOMINATIM_SEARCH_URL}?${new URLSearchParams({ q: query, format: 'json', limit: '1', countrycodes: 'in' })}`;
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) {
        this.logger.warn(`Geocode lookup failed for "${query}": HTTP ${res.status}`);
        return null;
      }
      const results = (await res.json()) as { lat: string; lon: string; display_name: string }[];
      if (results.length === 0) return null;
      const [best] = results;
      return { latitude: Number(best.lat), longitude: Number(best.lon), displayName: best.display_name };
    } catch (err) {
      this.logger.warn(`Geocode lookup errored for "${query}": ${err}`);
      return null;
    }
  }
}
