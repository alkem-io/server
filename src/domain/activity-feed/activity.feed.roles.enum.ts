import { registerEnumType } from '@nestjs/graphql';

export enum ActivityFeedRoles {
  MEMBER = 'member',
  ADMIN = 'admin',
  LEAD = 'lead',
}

registerEnumType(ActivityFeedRoles, {
  name: 'ActivityFeedRoles',
});
