import { ObjectType } from '@nestjs/graphql';
import { InAppNotification } from '@domain/in-app-notification-reader/in.app.notification.interface';

@ObjectType('InAppNotificationReceivedSubscriptionResult', {
  description: 'The generated notification for the subscribed user.',
})
export class InAppNotificationReceivedSubscriptionResult extends InAppNotification {}
