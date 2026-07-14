import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../core/prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

/**
 * Resolves :campaignId from the route into a TenantContext (spec §7: "a person may hold different
 * roles in different campaigns") and enforces any @RequirePermissions(...) on the route against
 * that role's *configured* permissions — never a hard-coded role-name check (spec §8).
 *
 * The lookup itself deliberately runs with RLS bypassed: it is hard-filtered to
 * `userId = <the authenticated caller's own id>` (never client-controlled) and
 * `campaignId = <route param>`, so it can only ever confirm or deny a role the caller actually
 * holds — it cannot be used to read another user's or another tenant's data. See
 * PrismaService.runWithBypass for the general rule this follows.
 */
@Injectable()
export class CampaignScopeGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const campaignId = request.params?.campaignId;
    if (!campaignId) {
      throw new ForbiddenException('Route is campaign-scoped but no campaignId was provided');
    }
    const userId = request.user?.id;

    const membership = await this.prisma.runWithBypass((tx) =>
      tx.userCampaignRole.findFirst({
        where: {
          userId,
          campaignId,
          status: 'ACTIVE',
          OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: new Date() } }],
        },
        include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
      }),
    );

    if (!membership) {
      // Data isolation (spec acceptance scenario 6): no membership means no visibility, full stop.
      throw new ForbiddenException('You do not have access to this campaign');
    }

    const permissions = membership.role.rolePermissions.map((rp) => rp.permission.code);
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required && required.length > 0) {
      const hasAll = required.every((p) => permissions.includes(p));
      if (!hasAll) {
        throw new ForbiddenException(`Missing required permission(s): ${required.join(', ')}`);
      }
    }

    request.tenant = {
      clientId: membership.clientId,
      campaignId: membership.campaignId,
      userId,
      roleId: membership.roleId,
      roleCode: membership.role.code,
      roleName: membership.role.name,
      permissions,
    };
    return true;
  }
}
