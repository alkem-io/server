import { registerEnumType } from '@nestjs/graphql';

/**
 * When using the enum as a resolve value in GraphQL, you have to use the decorated value instead of the export by the lib type
 */
export enum InAppNotificationCategory {
  SELF = 'self',
  MEMBER = 'member',
  ADMIN = 'admin',
}

registerEnumType(InAppNotificationCategory, {
  name: 'InAppNotificationCategory',
  description: 'Which category (role) is this notification targeted to.',
});
