import { SetMetadata } from '@nestjs/common';

export const ORGANIZATION_SCOPE_KEY = 'organizationScope';
export const OrganizationScope = (paramName: string) =>
  SetMetadata(ORGANIZATION_SCOPE_KEY, paramName);
