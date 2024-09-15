import { registerEnumType } from '@nestjs/graphql';

export enum CommunityRoleType {
  MEMBER = 'member',
  LEAD = 'lead',
  ADMIN = 'admin',
}

registerEnumType(CommunityRoleType, {
  name: 'CommunityRoleType',
});
