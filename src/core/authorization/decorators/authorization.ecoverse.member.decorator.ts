import { SetMetadata } from '@nestjs/common';

export const AuthorizationEcoverseMember = () =>
  SetMetadata('ecoverse-member', true);
