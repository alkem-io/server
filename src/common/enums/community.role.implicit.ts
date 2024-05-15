import { registerEnumType } from '@nestjs/graphql';

export enum CommunityRoleImplicit {
  SUBSPACE_ADMIN = 'subspace-admin',
}

registerEnumType(CommunityRoleImplicit, {
  name: 'CommunityRoleImplicit',
});
