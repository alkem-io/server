import { registerEnumType } from '@nestjs/graphql';

export enum OrganizationRole {
  ASSOCIATE = 'associate',
  OWNER = 'owner',
  ADMIN = 'admin',
}

registerEnumType(OrganizationRole, {
  name: 'OrganizationRole',
});
