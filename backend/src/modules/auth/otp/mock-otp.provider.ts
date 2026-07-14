import { Injectable, Logger } from '@nestjs/common';
import { OtpProvider } from './otp-provider.interface';

/**
 * MOCK OTP PROVIDER — never sends a real SMS. It logs the plain code to the backend console.
 * AuthService additionally echoes the code in the API response body, but only when
 * OTP_PROVIDER=mock (enforced there, not here) — this file's only job is the "delivery" side, and
 * its own name makes clear in every log line that nothing left this machine.
 */
@Injectable()
export class MockOtpProvider implements OtpProvider {
  readonly name = 'MOCK';
  private readonly logger = new Logger('MOCK-OTP');

  async send(countryCode: string, mobileNumber: string, code: string): Promise<void> {
    this.logger.warn(
      `[MOCK] OTP for ${countryCode}${mobileNumber}: ${code} (no real SMS sent — development mock provider)`,
    );
  }
}
