import { Global, Module } from '@nestjs/common';
import { MockWhatsAppProvider } from './mock-whatsapp.provider';
import { NotificationService } from './notification.service';
import { WHATSAPP_PROVIDER } from './whatsapp-provider.interface';

@Global()
@Module({
  providers: [
    NotificationService,
    {
      provide: WHATSAPP_PROVIDER,
      useFactory: () => {
        const provider = process.env.WHATSAPP_PROVIDER ?? 'mock';
        if (provider !== 'mock') {
          throw new Error(
            `WHATSAPP_PROVIDER=${provider} has no adapter implementation yet — only "mock" exists in this phase.`,
          );
        }
        return new MockWhatsAppProvider();
      },
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
