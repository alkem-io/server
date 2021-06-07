import { SetMetadata } from '@nestjs/common';

export const AuthorizationAgentPrivilege = (privilege: string) =>
  SetMetadata('privilege', privilege);
