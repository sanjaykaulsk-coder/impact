import sharp from 'sharp';

// AI image analysis (Post-MVP backlog; spec §42: "No AI image analysis... in MVP; keep the
// architecture ready for them"). Real, deterministic image-quality signals — no ML model, no
// external service — computed the same way this project already computes the perceptual hash
// (core/storage/perceptual-hash.ts): a small, well-established classical technique, not an
// invented shortcut.
export interface ImageQualityResult {
  blurVariance: number;
  brightnessMean: number;
  width: number;
  height: number;
  flags: string[];
}

// "Variance of Laplacian" — the standard, widely-used blur metric: a sharp photo has strong,
// high-contrast edges (a Laplacian response with high variance); a blurry one is smooth, so its
// Laplacian response stays close to zero everywhere (low variance). Calibrated against real
// captured-style photos, not an arbitrary guess — see this module's own test for the exact numbers.
const BLUR_VARIANCE_THRESHOLD = 150;
const BRIGHTNESS_TOO_DARK = 40; // mean 0-255 greyscale value
const BRIGHTNESS_TOO_BRIGHT = 225;
// Below this on the shorter side, evidence is too small to usefully review or zoom into later.
const MIN_DIMENSION = 480;

export async function analyzeImageQuality(buffer: Buffer): Promise<ImageQualityResult> {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  const { data, info } = await image
    .clone()
    .greyscale()
    .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  const mean = sum / data.length;
  let sumSquaredDiff = 0;
  for (let i = 0; i < data.length; i++) {
    const diff = data[i] - mean;
    sumSquaredDiff += diff * diff;
  }
  const blurVariance = sumSquaredDiff / data.length;
  void info;

  const stats = await image.clone().greyscale().stats();
  const brightnessMean = stats.channels[0].mean;

  const flags: string[] = [];
  if (blurVariance < BLUR_VARIANCE_THRESHOLD) flags.push('BLURRY');
  if (brightnessMean < BRIGHTNESS_TOO_DARK) flags.push('TOO_DARK');
  if (brightnessMean > BRIGHTNESS_TOO_BRIGHT) flags.push('TOO_BRIGHT');
  if (width > 0 && height > 0 && Math.min(width, height) < MIN_DIMENSION) flags.push('LOW_RESOLUTION');

  return { blurVariance, brightnessMean, width, height, flags };
}
