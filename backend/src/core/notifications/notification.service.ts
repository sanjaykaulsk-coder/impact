import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WHATSAPP_PROVIDER, WhatsAppProvider } from './whatsapp-provider.interface';

export interface NotifyInput {
  userId: string;
  title: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  /** Defaults to both — spec §29's "channels: in-app, push, WhatsApp." Push has no real device-token
   * registration built anywhere in this app yet, so it's not offered here (a known, logged gap, not
   * silently pretended-to-work) — only IN_APP and WHATSAPP are real today. */
  channels?: NotificationChannel[];
}

// Spec §29's alert engine channels, generalized beyond device-risk's own narrow Alert reads —
// every escalation/assignment notification in S5.2 goes through here so there's exactly one place
// that decides how a notification actually gets delivered, matching AuditService's role as the
// one place audit entries get written.
//
// Split into queue() + dispatch() rather than one method, on purpose: A-034 (S2 photo upload) is
// the standing lesson in this codebase against holding a Prisma transaction open across slow
// external I/O. The mock provider here is instant, but a real WhatsApp Business API call won't be
// — queue() only ever writes rows inside the caller's existing transaction; dispatch() sends and
// updates status afterward, called once that transaction has actually committed.
@Injectable()
export class NotificationService {
  private readonly logger = new Logger('NotificationService');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
  ) {}

  async queue(tx: Prisma.TransactionClient, input: NotifyInput): Promise<string[]> {
    const channels = input.channels ?? (['IN_APP', 'WHATSAPP'] as NotificationChannel[]);
    const ids: string[] = [];
    for (const channel of channels) {
      const notification = await tx.notification.create({
        data: {
          userId: input.userId,
          channel,
          title: input.title,
          body: input.body,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          status: 'PENDING',
        },
      });
      ids.push(notification.id);
    }
    return ids;
  }

  /** Call once the transaction that queued these notifications has committed. */
  async dispatch(notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return;
    const notifications = await this.prisma.runWithBypass((tx) =>
      tx.notification.findMany({ where: { id: { in: notificationIds } } }),
    );

    for (const n of notifications) {
      if (n.channel === 'IN_APP') {
        await this.prisma.runWithBypass((tx) =>
          tx.notification.update({ where: { id: n.id }, data: { status: 'SENT', sentAt: new Date() } }),
        );
        continue;
      }

      if (n.channel === 'WHATSAPP') {
        const credential = await this.prisma.runWithBypass((tx) => tx.mobileCredential.findUnique({ where: { userId: n.userId } }));
        if (!credential) {
          this.logger.warn(`No mobile number on file for user ${n.userId} — skipping WhatsApp notification`);
          await this.prisma.runWithBypass((tx) => tx.notification.update({ where: { id: n.id }, data: { status: 'FAILED' } }));
          continue;
        }
        try {
          await this.whatsapp.send(`${credential.countryCode}${credential.mobileNumber}`, `${n.title}\n${n.body}`);
          await this.prisma.runWithBypass((tx) =>
            tx.notification.update({ where: { id: n.id }, data: { status: 'SENT', sentAt: new Date() } }),
          );
        } catch {
          await this.prisma.runWithBypass((tx) => tx.notification.update({ where: { id: n.id }, data: { status: 'FAILED' } }));
        }
      }
    }
  }
}
