import { registerEnumType } from '@nestjs/graphql';

export enum RoleSetRoleImplicit {
  SUBSPACE_ADMIN = 'subspace-admin',
}

registerEnumType(RoleSetRoleImplicit, {
  name: 'RoleSetRoleImplicit',
});
