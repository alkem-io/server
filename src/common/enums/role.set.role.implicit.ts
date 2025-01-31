import { registerEnumType } from '@nestjs/graphql';

export enum RoleSetRoleImplicit {
  SUBSPACE_ADMIN = 'subspace-admin',
  ACCOUNT_ADMIN = 'account-admin',
}

registerEnumType(RoleSetRoleImplicit, {
  name: 'RoleSetRoleImplicit',
});
