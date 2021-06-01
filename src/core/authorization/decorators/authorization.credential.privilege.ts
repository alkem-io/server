import { SetMetadata } from '@nestjs/common';

export const AuthorizationCredentialPrivilege = (privilege: string) =>
  SetMetadata('privilege', privilege);
