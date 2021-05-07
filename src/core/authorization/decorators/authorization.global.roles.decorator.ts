import { SetMetadata } from '@nestjs/common';

export const AuthorizationGlobalRoles = (
  ...authorizationGlobalRoles: string[]
) => SetMetadata('authorizationGlobalRoles', authorizationGlobalRoles);
