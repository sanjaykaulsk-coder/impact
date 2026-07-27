import { Injectable, Logger } from '@nestjs/common';
import { ImageContentClassificationResult, ImageContentClassifier } from './image-content-classifier.interface';

/**
 * MOCK IMAGE CONTENT CLASSIFIER — never calls a real vision AI. The same posture as
 * MockOtpProvider/MockWhatsAppProvider: its own name and result payload make clear in every log
 * line and every API response that nothing was actually analysed for content — only the real,
 * local quality metrics (core/media-ai/image-quality.ts) are genuine.
 */
@Injectable()
export class MockImageContentClassifier implements ImageContentClassifier {
  readonly name = 'MOCK';
  private readonly logger = new Logger('MOCK-IMAGE-AI');

  async classify(_buffer: Buffer): Promise<ImageContentClassificationResult> {
    this.logger.warn('[MOCK] Content classification requested — no real vision AI configured in this environment.');
    return {
      mock: true,
      label: 'NOT_ANALYZED',
      confidence: 0,
      note: 'Real content classification (e.g. branding/POSM presence) requires a cloud vision provider — not configured in this environment.',
    };
  }
}
