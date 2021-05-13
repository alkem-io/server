import { SetMetadata } from '@nestjs/common';

export const AuthorizationSelfManagement = () =>
  SetMetadata('self-management', true);
