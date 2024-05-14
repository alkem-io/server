import { registerEnumType } from '@nestjs/graphql';

export enum CommunityRole {
  MEMBER = 'member',
  LEAD = 'lead',
  ADMIN = 'admin',
  SUBSPACE_ADMIN = 'subspace-admin',
}

registerEnumType(CommunityRole, {
  name: 'CommunityRole',
});
