import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppProvider } from './whatsapp-provider.interface';

/**
 * MOCK WHATSAPP PROVIDER — never sends a real WhatsApp message. It logs the plain text to the
 * backend console, the same posture as MockOtpProvider: its own name makes clear in every log
 * line that nothing left this machine.
 */
@Injectable()
export class MockWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'MOCK';
  private readonly logger = new Logger('MOCK-WHATSAPP');

  async send(mobileNumber: string, message: string): Promise<void> {
    this.logger.warn(`[MOCK] WhatsApp to ${mobileNumber}: ${message} (no real message sent — development mock provider)`);
  }
}
