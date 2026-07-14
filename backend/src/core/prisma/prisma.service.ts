import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * The API connects with APP_DATABASE_URL — the restricted `field_command_app` Postgres role
 * created by the rls_and_app_role migration, not the migration-owner role. Postgres superusers
 * and unforced table owners always bypass Row-Level Security, so if the app connected as the
 * owner, every RLS policy in the schema would be silently inert. See migration comments for the
 * full three-layer isolation design.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: { db: { url: process.env.APP_DATABASE_URL } },
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to Postgres as the restricted field_command_app role');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Runs `fn` inside a Postgres transaction with `app.tenant_id` set via SET LOCAL (via
   * set_config's third argument), so every query `fn` issues is subject to the tenant_isolation
   * RLS policy for exactly that client. This is the only correct way to combine Prisma's pooled
   * connections with a session-scoped RLS GUC — a plain (session-level) SET would leak across
   * requests that happen to reuse the same pooled connection.
   */
  async runInTenantContext<T>(
    clientId: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.tenant_id', ${clientId}, true), set_config('app.bypass_rls', 'false', true)`;
      return fn(tx);
    });
  }

  /**
   * Deliberate cross-tenant bypass — never a default path. Every call site must justify in a
   * comment why the query is safe without tenant scoping (e.g. hard-filtered to the authenticated
   * user's own id, which is never client-controlled; or gated by a verified platform-level
   * permission such as `platform.cross_tenant_access`).
   */
  async runWithBypass<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      // Explicitly clears app.tenant_id too, not just sets bypass_rls — belt-and-suspenders
      // alongside the NULLIF(...) fix in the RLS policy itself (see the fix_rls_empty_string_guc
      // migration for why a stale value can otherwise survive on a reused pooled connection).
      await tx.$queryRaw`SELECT set_config('app.tenant_id', '', true), set_config('app.bypass_rls', 'true', true)`;
      return fn(tx);
    });
  }
}
