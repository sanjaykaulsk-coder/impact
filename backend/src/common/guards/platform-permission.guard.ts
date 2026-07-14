import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../core/prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

/**
 * For endpoints that are not scoped to one campaign — client management chief among them, since
 * creating a brand-new client happens before any campaign of theirs exists to scope to (spec
 * §9.1). Checks whether the caller holds the required permission on *any* of their active
 * campaign-role assignments, not one specific campaign.
 *
 * This is a direct consequence of the platform-role gap logged in docs/ASSUMPTIONS.md A-017:
 * spec §34's schema has no campaign-independent role grant, so platform staff (Super Admin,
 * Impact System Administrator) hold their role on every seeded campaign as a workaround. Checking
 * "any assignment" rather than "the current campaign's assignment" is the correct way to honour
 * that workaround here, and is still fully permission-code-driven, never a hard-coded role name.
 *
 * The lookup runs with RLS bypassed — safe because it is hard-filtered to
 * `userId = <the authenticated caller's own id>`, the same narrow-bypass rule as elsewhere.
 */
@Injectable()
export class PlatformPermissionGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const memberships = await this.prisma.runWithBypass((tx) =>
      tx.userCampaignRole.findMany({
        where: {
          userId,
          status: 'ACTIVE',
          OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: new Date() } }],
        },
        include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
      }),
    );

    const heldPermissions = new Set<string>();
    for (const m of memberships) {
      for (const rp of m.role.rolePermissions) heldPermissions.add(rp.permission.code);
    }

    const hasAll = required.every((p) => heldPermissions.has(p));
    if (!hasAll) {
      throw new ForbiddenException(`Missing required permission(s): ${required.join(', ')}`);
    }
    return true;
  }
}
