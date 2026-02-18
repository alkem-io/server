import { registerEnumType } from '@nestjs/graphql';

/**
 * When using the enum as a resolve value in GraphQL, you have to use the decorated value instead of the export by the lib type
 */
export enum NotificationEventCategory {
  SPACE_MEMBER = 'space_member',
  SPACE_ADMIN = 'space_admin',
  ORGANIZATION = 'organization',
  USER = 'user',
  VIRTUAL = 'virtual_contributor',
  PLATFORM = 'platform',
}

registerEnumType(NotificationEventCategory, {
  name: 'NotificationEventCategory',
  description: 'A categorization of notification type.',
});
