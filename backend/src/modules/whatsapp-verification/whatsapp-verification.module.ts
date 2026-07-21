import { Module } from '@nestjs/common';
import { WhatsAppVerificationController } from './whatsapp-verification.controller';
import { WhatsAppVerificationService } from './whatsapp-verification.service';

@Module({
  controllers: [WhatsAppVerificationController],
  providers: [WhatsAppVerificationService],
})
export class WhatsAppVerificationModule {}
