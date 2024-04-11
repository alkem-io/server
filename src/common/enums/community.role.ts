import { registerEnumType } from '@nestjs/graphql';

export enum CommunityRole {
  MEMBER = 'member',
  LEAD = 'lead',
  ADMIN = 'admin',
}

registerEnumType(CommunityRole, {
  name: 'CommunityRole',
});
