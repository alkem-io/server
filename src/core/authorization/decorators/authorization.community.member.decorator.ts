import { SetMetadata } from '@nestjs/common';

export const AuthorizationCommunityMember = () =>
  SetMetadata('community-member', true);
