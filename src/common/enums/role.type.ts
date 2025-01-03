import { registerEnumType } from '@nestjs/graphql';

export enum RoleType {
  MEMBER = 'member',
  LEAD = 'lead',
  ADMIN = 'admin',
  ASSOCIATE = 'associate',
  OWNER = 'owner',
}

registerEnumType(RoleType, {
  name: 'RoleType',
});
