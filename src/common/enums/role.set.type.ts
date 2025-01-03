import { registerEnumType } from '@nestjs/graphql';

export enum RoleSetType {
  SPACE = 'space',
  ORGANIZATION = 'organization',
  PLATFORM = 'platform',
}

registerEnumType(RoleSetType, {
  name: 'RoleSetType',
});
