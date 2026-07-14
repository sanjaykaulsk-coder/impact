import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Configurable RBAC (spec §8): routes declare *permission codes*, never role names, so the set of
 * roles that satisfy a route is entirely data (Role/Permission/RolePermission), editable from the
 * admin portal without a code change.
 */
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
