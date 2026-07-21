import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../core/audit/audit.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../core/prisma/tenant-context';
import { CompleteWhatsAppVerificationDto, StartWhatsAppVerificationDto } from './dto/whatsapp-verification.dto';

// Spec §31: "Supervisor opens activity -> Start Verification Call -> app opens WhatsApp
// conversation/call intent -> supervisor conducts call -> returns -> marks verification complete
// -> selects outcome -> adds remarks." The actual call happens entirely inside WhatsApp on the
// supervisor's own device — this service only ever records that metadata (who, when, what
// outcome), never call content, per the spec's own "never store WhatsApp call recordings or
// private call data."
@Injectable()
export class WhatsAppVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async history(tenant: TenantContext, activityInstanceId: string) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      await this.findActivityOrThrow(tx, tenant, activityInstanceId);
      return tx.whatsAppVerification.findMany({
        where: { activityInstanceId, campaignId: tenant.campaignId },
        orderBy: { startedAt: 'desc' },
      });
    });
  }

  /** Returns the created record plus a `waLink` the web admin opens directly — a plain
   * https://wa.me deep link needs no backend "send" step at all, matching how every other
   * WhatsApp-initiated call in the real product works (opened from the supervisor's own device). */
  async start(tenant: TenantContext, activityInstanceId: string, actorUserId: string, dto: StartWhatsAppVerificationDto) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const activity = await this.findActivityOrThrow(tx, tenant, activityInstanceId);
      if (!activity.assignedUserId) {
        throw new BadRequestException('This activity has no assigned field worker to verify with yet');
      }
      const credential = await tx.mobileCredential.findUnique({ where: { userId: activity.assignedUserId } });
      if (!credential) {
        throw new BadRequestException('The assigned field worker has no mobile number on file');
      }

      const verification = await tx.whatsAppVerification.create({
        data: {
          clientId: tenant.clientId,
          campaignId: tenant.campaignId,
          activityInstanceId,
          initiatedByUserId: actorUserId,
          verificationType: dto.verificationType,
        },
      });

      await this.audit.record(tx, {
        clientId: tenant.clientId,
        campaignId: tenant.campaignId,
        actorUserId,
        action: 'WHATSAPP_VERIFICATION_STARTED',
        entityType: 'WhatsAppVerification',
        entityId: verification.id,
        before: undefined,
        after: verification,
      });

      const waNumber = `${credential.countryCode}${credential.mobileNumber}`.replace('+', '');
      return { ...verification, waLink: `https://wa.me/${waNumber}` };
    });
  }

  async complete(tenant: TenantContext, verificationId: string, actorUserId: string, dto: CompleteWhatsAppVerificationDto) {
    return this.prisma.runInTenantContext(tenant.clientId, async (tx) => {
      const before = await tx.whatsAppVerification.findFirst({ where: { id: verificationId, campaignId: tenant.campaignId } });
      if (!before) throw new NotFoundException('Verification not found');
      if (before.completedAt) throw new BadRequestException('This verification has already been marked complete');

      const after = await tx.whatsAppVerification.update({
        where: { id: verificationId },
        data: { completedAt: new Date(), outcome: dto.outcome, remarks: dto.remarks },
      });

      await this.audit.record(tx, {
        clientId: tenant.clientId,
        campaignId: tenant.campaignId,
        actorUserId,
        action: 'WHATSAPP_VERIFICATION_COMPLETED',
        entityType: 'WhatsAppVerification',
        entityId: verificationId,
        before,
        after,
      });
      return after;
    });
  }

  private async findActivityOrThrow(tx: Prisma.TransactionClient, tenant: TenantContext, activityInstanceId: string) {
    const activity = await tx.activityInstance.findFirst({ where: { id: activityInstanceId, campaignId: tenant.campaignId } });
    if (!activity) throw new NotFoundException('Activity not found');
    return activity;
  }
}
