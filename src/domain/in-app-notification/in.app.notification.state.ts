import { registerEnumType } from '@nestjs/graphql';

export enum InAppNotificationState {
  READ = 'read',
  UNREAD = 'unread',
  ARCHIVED = 'archived',
}

registerEnumType(InAppNotificationState, {
  name: 'InAppNotificationState',
});
