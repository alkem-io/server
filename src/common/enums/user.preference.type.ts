import { registerEnumType } from '@nestjs/graphql';

export enum UserPreferenceType {
  NOTIFICATION_APPLICATION_RECEIVED = 'NotificationApplicationReceived',
  NOTIFICATION_USER_SIGN_UP = 'NotificationUserSignUp',
}

registerEnumType(UserPreferenceType, {
  name: 'UserPreferenceType',
});
