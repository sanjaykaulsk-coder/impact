/**
 * Adapter interface for WhatsApp delivery (CLAUDE.md: "adapter interfaces + mock providers for OTP
 * and WhatsApp in development; no real credentials in code, ever"). A production implementation
 * (WhatsApp Business API — spec §08 founder decision, still pending) drops in behind this same
 * interface with zero changes to NotificationService.
 */
export interface WhatsAppProvider {
  /** Human-readable adapter name, surfaced in logs so MOCK is never ambiguous. */
  readonly name: string;
  send(mobileNumber: string, message: string): Promise<void>;
}

export const WHATSAPP_PROVIDER = Symbol('WHATSAPP_PROVIDER');
