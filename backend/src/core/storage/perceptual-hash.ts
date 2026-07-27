import sharp from 'sharp';

// Perceptual duplicate detection (spec §17/§18; docs/architecture/08 §5: "exact-hash duplicates in
// MVP; perceptual similarity (near-duplicates) post-MVP as an IQ-adjacent capability" — this is
// that post-MVP piece). A difference hash (dHash): resize to a tiny 9×8 greyscale grid, then record
// whether each pixel is brighter or darker than its right-hand neighbour — 64 bits total. Two
// images of the same real-world scene (even re-compressed, lightly cropped, or re-photographed off
// a screen/printout) produce nearly identical hashes; two genuinely different photos produce hashes
// that differ in roughly half their bits. This is the standard, well-established algorithm for this
// exact use case — no ML model or external service needed.
const HASH_SIZE = 8;

export async function computePerceptualHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .resize(HASH_SIZE + 1, HASH_SIZE, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let bits = '';
  for (let row = 0; row < HASH_SIZE; row++) {
    for (let col = 0; col < HASH_SIZE; col++) {
      const left = data[row * (HASH_SIZE + 1) + col];
      const right = data[row * (HASH_SIZE + 1) + col + 1];
      bits += left < right ? '1' : '0';
    }
  }

  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

/** Number of differing bits between two hashes — 0 is byte-for-byte identical content, ~32 (half
 * of 64) is what two unrelated photos typically land around. */
export function hammingDistance(hashA: string, hashB: string): number {
  if (hashA.length !== hashB.length) return Number.MAX_SAFE_INTEGER;
  let distance = 0;
  for (let i = 0; i < hashA.length; i++) {
    let x = parseInt(hashA[i], 16) ^ parseInt(hashB[i], 16);
    while (x) {
      distance += x & 1;
      x >>= 1;
    }
  }
  return distance;
}

// A gap validated against common perceptual-hash usage (pHash/dHash implementations generally
// treat single-digit Hamming distances as "very likely the same or a lightly edited image" and
// climb quickly past that for genuinely different photos) — conservative enough not to flag two
// different but visually similar real stalls/products as duplicates.
export const PERCEPTUAL_DUPLICATE_THRESHOLD = 10;
