import 'dart:typed_data';

import 'package:image/image.dart' as img;

/// AI image analysis (Post-MVP backlog, spec §42) — the on-device half. Same real technique as
/// the backend's own quality check (backend/src/core/media-ai/image-quality.ts): variance-of-
/// Laplacian for blur, mean luminance for exposure — no ML model, no external service. Run here
/// too, right after capture, so a field worker can retake a bad photo before it ever leaves the
/// phone, rather than only finding out later when a supervisor reviews it.
class OnDeviceImageQualityResult {
  final double blurVariance;
  final double brightnessMean;
  final List<String> flags;
  const OnDeviceImageQualityResult({required this.blurVariance, required this.brightnessMean, required this.flags});
}

// Calibrated separately from the backend's threshold (150 at full resolution) — this analysis
// downscales to a small width first (kept fast enough to run on a 3-4 year old phone right after
// a photo is taken), and the same blur produces a smaller Laplacian response at lower resolution.
// Validated with a real Dart script against a synthetic sharp-edged test image at this same
// analysis width: an in-focus image scored ~21,700; a heavy, obviously-unusable blur (radius 8)
// scored ~870; a mild blur (radius 2, often still fine as evidence) scored ~6,660. This threshold
// sits between the "heavy blur" and "mild blur" cases, biased toward not nagging the field worker
// over a photo that's still genuinely usable.
const _blurVarianceThreshold = 1200.0;
// Same 0-255 luminance scale as the backend's check (sharp's stats().mean), so these numbers are
// reused rather than re-derived.
const _brightnessTooDark = 40.0;
const _brightnessTooBright = 225.0;
const _analysisWidth = 200;

OnDeviceImageQualityResult analyzeOnDeviceImageQuality(Uint8List bytes) {
  final decoded = img.decodeImage(bytes);
  if (decoded == null) {
    // Can't decode — don't block the field worker over a codec quirk this analysis doesn't
    // handle; the server-side check (which uses a different, more capable library) is the
    // backstop either way.
    return const OnDeviceImageQualityResult(blurVariance: -1, brightnessMean: -1, flags: []);
  }

  final small = img.copyResize(decoded, width: _analysisWidth);
  final grey = img.grayscale(small);
  final width = grey.width;
  final height = grey.height;

  final lum = Float64List(width * height);
  double sum = 0;
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      final l = grey.getPixel(x, y).luminance.toDouble();
      lum[y * width + x] = l;
      sum += l;
    }
  }
  final brightnessMean = sum / lum.length;

  // 3x3 Laplacian kernel: 0 1 0 / 1 -4 1 / 0 1 0 — same kernel the backend uses.
  final laplacianCount = (width - 2) * (height - 2);
  final lap = Float64List(laplacianCount > 0 ? laplacianCount : 0);
  var i = 0;
  for (var y = 1; y < height - 1; y++) {
    for (var x = 1; x < width - 1; x++) {
      final center = lum[y * width + x];
      final up = lum[(y - 1) * width + x];
      final down = lum[(y + 1) * width + x];
      final left = lum[y * width + x - 1];
      final right = lum[y * width + x + 1];
      lap[i++] = up + down + left + right - 4 * center;
    }
  }

  double blurVariance = 0;
  if (lap.isNotEmpty) {
    double lapSum = 0;
    for (final v in lap) {
      lapSum += v;
    }
    final lapMean = lapSum / lap.length;
    double sumSquaredDiff = 0;
    for (final v in lap) {
      final d = v - lapMean;
      sumSquaredDiff += d * d;
    }
    blurVariance = sumSquaredDiff / lap.length;
  }

  final flags = <String>[];
  if (blurVariance < _blurVarianceThreshold) flags.add('BLURRY');
  if (brightnessMean < _brightnessTooDark) flags.add('TOO_DARK');
  if (brightnessMean > _brightnessTooBright) flags.add('TOO_BRIGHT');

  return OnDeviceImageQualityResult(blurVariance: blurVariance, brightnessMean: brightnessMean, flags: flags);
}
