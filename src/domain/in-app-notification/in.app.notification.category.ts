import { registerEnumType } from '@nestjs/graphql';
import { InAppNotificationCategory } from '../../../../notifications/lib/src';

registerEnumType(InAppNotificationCategory, {
  name: 'InAppNotificationCategory',
  description: 'Which category (role) is this notification targeted to.',
});
