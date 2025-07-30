import { registerEnumType } from '@nestjs/graphql';

export enum UserNotificationSetting {
  PLATFORM_FORUM_DISCUSSION_COMMENT = 'space',
  PLATFORM_FORUM_DISCUSSION_CREATED = 'account',
  ORGANIZATION_MENTIONED = 'user',
}

registerEnumType(UserNotificationSetting, {
  name: 'UserNotificationSetting',
});
