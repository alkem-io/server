import { registerEnumType } from '@nestjs/graphql';

export enum RoleSetContributorType {
  USER = 'user',
  ORGANIZATION = 'organization',
  VIRTUAL = 'virtual',
}

registerEnumType(RoleSetContributorType, {
  name: 'RoleSetContributorType',
});
