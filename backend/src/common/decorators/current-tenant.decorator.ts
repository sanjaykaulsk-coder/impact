import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '../../core/prisma/tenant-context';

/** Set by CampaignScopeGuard from the route's :campaignId param + the caller's UserCampaignRole. */
export const CurrentTenant = createParamDecorator((_: unknown, ctx: ExecutionContext): TenantContext => {
  const request = ctx.switchToHttp().getRequest();
  return request.tenant;
});
