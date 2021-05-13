import { SetMetadata } from '@nestjs/common';

export const AuthorizationOrganisationMember = () =>
  SetMetadata('organisation-member', true);
