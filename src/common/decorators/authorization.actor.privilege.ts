import { SetMetadata } from '@nestjs/common';

export const AuthorizationActorPrivilege = (privilege: string) =>
  SetMetadata('privilege', privilege);
