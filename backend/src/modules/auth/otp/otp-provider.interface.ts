/**
 * Adapter interface for OTP delivery (CLAUDE.md: "adapter interfaces + mock providers for OTP and
 * WhatsApp in development; no real credentials in code, ever"). A production implementation
 * (MSG91 / Twilio / other — spec §08 founder decision, still pending) drops in behind this same
 * interface with zero changes to AuthService.
 */
export interface OtpProvider {
  /** Human-readable adapter name, surfaced in logs and API responses so MOCK is never ambiguous. */
  readonly name: string;
  send(countryCode: string, mobileNumber: string, code: string): Promise<void>;
}

export const OTP_PROVIDER = Symbol('OTP_PROVIDER');
