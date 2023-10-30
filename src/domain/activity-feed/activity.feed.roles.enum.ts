import { registerEnumType } from '@nestjs/graphql';

export enum ActivityFeedRoles {
  MEMBER = 'member',
  ADMIN = 'admin',
}

registerEnumType(ActivityFeedRoles, {
  name: 'ActivityFeedRoles',
});
