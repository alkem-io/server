import { registerEnumType } from '@nestjs/graphql';

export enum InAppNotificationState {
  Read = 'read',
  Unread = 'unread',
  Archived = 'archived',
}

registerEnumType(InAppNotificationState, {
  name: 'InAppNotificationState',
});
