import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

interface AuditEntry {
  clientId: string;
  campaignId?: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Writes to `audit_logs` (spec §37, CLAUDE.md: "immutable audit logs are day-one architecture, not
 * polish"). The table itself already has UPDATE/DELETE revoked from the app DB role (see the
 * rls_and_app_role migration) — this service is only responsible for the INSERT side. Callers pass
 * the same `tx` they're already using for the entity change, so the audit row commits atomically
 * with it — never a fire-and-forget write from a separate connection.
 */
@Injectable()
export class AuditService {
  async record(tx: Prisma.TransactionClient, entry: AuditEntry) {
    await tx.auditLog.create({
      data: {
        clientId: entry.clientId,
        campaignId: entry.campaignId,
        actorUserId: entry.actorUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        beforeJson: entry.before === undefined ? Prisma.JsonNull : (entry.before as Prisma.InputJsonValue),
        afterJson: entry.after === undefined ? Prisma.JsonNull : (entry.after as Prisma.InputJsonValue),
      },
    });
  }
}
