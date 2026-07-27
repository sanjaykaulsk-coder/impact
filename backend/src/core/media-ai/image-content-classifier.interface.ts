/**
 * Adapter interface for "smart" evidence-photo content classification (e.g. "does this actually
 * show the outlet/branding it claims to") — the same "adapter interfaces + mock providers... no
 * real credentials in code, ever" posture CLAUDE.md already sets for OTP and WhatsApp. A real
 * implementation (a cloud vision provider — Google Vision AI, AWS Rekognition, Azure Computer
 * Vision, or similar) drops in behind this same interface with zero changes to ExecutionService.
 */
export interface ImageContentClassificationResult {
  /** Always true until a real provider is configured — never fabricated as if it were a genuine
   * classification. */
  mock: boolean;
  label: string;
  confidence: number;
  note: string;
}

export interface ImageContentClassifier {
  /** Human-readable adapter name, surfaced in logs so MOCK is never ambiguous. */
  readonly name: string;
  classify(buffer: Buffer): Promise<ImageContentClassificationResult>;
}

export const IMAGE_CONTENT_CLASSIFIER = Symbol('IMAGE_CONTENT_CLASSIFIER');
