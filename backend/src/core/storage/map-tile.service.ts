import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

// Offline map corridors (spec §20, Post-MVP backlog — docs/ASSUMPTIONS.md A-075): per
// docs/architecture/08-risks-assumptions-recommendations.md, tiles come from OpenStreetMap. Every
// tile is fetched from OSM at most once ever, then cached permanently in the same MinIO bucket
// media already uses (under a "map-tiles/" prefix, not a new bucket — no infra change needed) —
// this is deliberate OSM-usage-policy hygiene, not just a performance optimisation: OSM's public
// tile servers explicitly ask heavy/automated consumers to run their own cache rather than
// hot-link at volume. A real production launch at field-force scale would still want a paid tile
// provider or a self-hosted tile server; this cache is the responsible shape for a dev/prototype
// build, not a claim that it's production-ready at scale.
const OSM_TILE_URL = (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
const USER_AGENT = 'ImpactFieldCommand/0.1 (dev/prototype build; contact: founder via app)';

@Injectable()
export class MapTileService implements OnModuleInit {
  private readonly logger = new Logger(MapTileService.name);
  private client!: Minio.Client;
  private bucket!: string;

  onModuleInit() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
      port: Number(process.env.MINIO_PORT ?? '9000'),
      useSSL: (process.env.MINIO_USE_SSL ?? 'false') === 'true',
      accessKey: process.env.MINIO_ROOT_USER ?? '',
      secretKey: process.env.MINIO_ROOT_PASSWORD ?? '',
    });
    this.bucket = process.env.MINIO_BUCKET_MEDIA ?? 'field-command-media';
  }

  private tileKey(z: number, x: number, y: number): string {
    return `map-tiles/${z}/${x}/${y}.png`;
  }

  private async exists(key: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, key);
      return true;
    } catch {
      return false;
    }
  }

  /** Fetches a tile from OpenStreetMap and caches it, unless it's already cached. */
  async ensureTileCached(z: number, x: number, y: number): Promise<void> {
    const key = this.tileKey(z, x, y);
    if (await this.exists(key)) return;

    const res = await fetch(OSM_TILE_URL(z, x, y), { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) {
      this.logger.warn(`Failed to fetch OSM tile ${z}/${x}/${y}: HTTP ${res.status}`);
      return;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await this.client.putObject(this.bucket, key, buffer, buffer.length, { 'Content-Type': 'image/png' });
  }

  /**
   * Raw tile bytes, read straight from MinIO. Deliberately NOT a signed URL the phone fetches
   * directly (that was this feature's first, real bug — a signed URL bakes in `MINIO_ENDPOINT`,
   * which is `localhost` from the backend's own point of view but unreachable as `localhost` from
   * a phone or emulator, exactly the same class of problem `api_client.dart` already documents for
   * the API host itself). Every other client/server exchange in this app goes through the one API
   * host the app already resolves correctly for both emulator and physical-device testing — tiles
   * now do too, proxied through this same channel instead of introducing a second host to resolve.
   */
  async getTileBuffer(z: number, x: number, y: number): Promise<Buffer> {
    const key = this.tileKey(z, x, y);
    const stream = await this.client.getObject(this.bucket, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }
}
