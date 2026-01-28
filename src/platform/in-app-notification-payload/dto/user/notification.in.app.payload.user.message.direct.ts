import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { ObjectType } from '@nestjs/graphql';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadUserBase } from './notification.in.app.payload.user.base';
@ObjectType('InAppNotificationPayloadUserMessageDirect', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadUserMessageDirect extends InAppNotificationPayloadUserBase {
  message!: string;
  declare type: NotificationEventPayload.USER_MESSAGE_DIRECT;
}
