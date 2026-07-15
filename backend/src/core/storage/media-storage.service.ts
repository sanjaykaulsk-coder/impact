import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createHash } from 'node:crypto';
import * as Minio from 'minio';
import sharp from 'sharp';

export interface WatermarkFields {
  locationName: string;
  capturedAt: Date;
  latitude?: number;
  longitude?: number;
  userFullName: string;
}

export interface StoredEvidence {
  objectKeyOriginal: string;
  objectKeyWatermarked: string;
  sha256Hash: string;
  sizeBytes: number;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Originals and watermarked copies live in separate object keys under the same bucket (spec §21:
 * "Originals and watermarked copies stored separately"), never in the database — the Media table
 * only ever stores the object keys. The watermark is a real pixel-composited strip (not just
 * stored metadata), matching spec §17's "clean strip that does not cover the subject."
 */
@Injectable()
export class MediaStorageService implements OnModuleInit {
  private readonly logger = new Logger(MediaStorageService.name);
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
    this.logger.log(`MediaStorageService connected to MinIO bucket "${this.bucket}"`);
  }

  async uploadEvidencePhoto(params: {
    buffer: Buffer;
    mimeType: string;
    clientId: string;
    campaignId: string;
    watermark: WatermarkFields;
  }): Promise<StoredEvidence> {
    const sha256Hash = createHash('sha256').update(params.buffer).digest('hex');
    const ext = params.mimeType === 'image/png' ? 'png' : 'jpg';
    const objectKeyOriginal = `${params.clientId}/${params.campaignId}/original/${sha256Hash}.${ext}`;
    const objectKeyWatermarked = `${params.clientId}/${params.campaignId}/watermarked/${sha256Hash}.jpg`;

    await this.client.putObject(this.bucket, objectKeyOriginal, params.buffer, params.buffer.length, {
      'Content-Type': params.mimeType,
    });

    const watermarked = await this.renderWatermark(params.buffer, params.watermark);
    await this.client.putObject(this.bucket, objectKeyWatermarked, watermarked, watermarked.length, {
      'Content-Type': 'image/jpeg',
    });

    return { objectKeyOriginal, objectKeyWatermarked, sha256Hash, sizeBytes: params.buffer.length };
  }

  private async renderWatermark(buffer: Buffer, w: WatermarkFields): Promise<Buffer> {
    // .metadata() reports the file's *un-rotated* pixel dimensions even when a later .rotate()
    // is queued on the pipeline — phone photos are routinely tagged with an EXIF orientation
    // (portrait shots from a landscape sensor) rather than physically rotated, so metadata().width
    // can be the pre-rotation value while .rotate()'s actual output is transposed. Sizing the
    // watermark SVG off that stale width broke sharp's composite() with "Image to composite must
    // have same dimensions or smaller" on real phone photos (never seen on desktop test images,
    // which typically have no EXIF orientation tag at all). Fixed by materializing the rotated
    // image into a buffer first, then reading dimensions from *that* — genuinely post-rotation.
    const rotated = await sharp(buffer).rotate().toBuffer();
    const image = sharp(rotated);
    const meta = await image.metadata();
    const width = meta.width ?? 1080;
    const stripHeight = Math.max(90, Math.round(width * 0.12));

    const lines = [
      w.locationName,
      `${w.capturedAt.toISOString().slice(0, 19).replace('T', ' ')} UTC`,
      w.latitude !== undefined && w.longitude !== undefined
        ? `${w.latitude.toFixed(6)}, ${w.longitude.toFixed(6)}`
        : null,
      w.userFullName,
    ].filter((l): l is string => Boolean(l));

    const lineHeight = stripHeight / (lines.length + 1);
    const fontSize = Math.max(14, Math.round(lineHeight * 0.7));
    const textLines = lines
      .map(
        (l, i) =>
          `<text x="16" y="${Math.round(lineHeight * (i + 1))}" font-family="sans-serif" font-size="${fontSize}" fill="white">${escapeXml(l)}</text>`,
      )
      .join('');
    const svg = `<svg width="${width}" height="${stripHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${stripHeight}" fill="rgba(0,0,0,0.55)" />
      ${textLines}
    </svg>`;

    return image
      .composite([{ input: Buffer.from(svg), gravity: 'south' }])
      .jpeg({ quality: 85 })
      .toBuffer();
  }

  async getSignedGetUrl(objectKey: string): Promise<string> {
    const ttlSeconds = Number(process.env.MINIO_SIGNED_URL_TTL_SECONDS ?? '900');
    return this.client.presignedGetObject(this.bucket, objectKey, ttlSeconds);
  }
}
