import { registerEnumType } from '@nestjs/graphql';
import { compareEnums } from '@common/utils';
import { InAppNotificationCategory as libEnum } from '@alkemio/notifications-lib';

/**
 * When using the enum as a resolve value in GraphQL, you have to use the decorated value instead of the export by the lib type
 */
export enum InAppNotificationCategory {
  SELF = 'self',
  MEMBER = 'member',
  ADMIN = 'admin',
}

if (!compareEnums(InAppNotificationCategory, libEnum)) {
  throw new Error('InAppNotificationCategory enums mismatch');
}

registerEnumType(InAppNotificationCategory, {
  name: 'InAppNotificationCategory',
  description: 'Which category (role) is this notification targeted to.',
});
