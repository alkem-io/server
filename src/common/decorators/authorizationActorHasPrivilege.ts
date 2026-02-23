import { SetMetadata } from '@nestjs/common';

export const AuthorizationActorHasPrivilege = (privilege: string) =>
  SetMetadata('privilege', privilege);
