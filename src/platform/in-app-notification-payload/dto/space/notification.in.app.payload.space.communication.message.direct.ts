import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { ObjectType } from '@nestjs/graphql';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadSpaceBase } from './notification.in.app.payload.space.base';
@ObjectType('InAppNotificationPayloadSpaceCommunicationMessageDirect', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunicationMessageDirect extends InAppNotificationPayloadSpaceBase {
  message!: string;
  declare type: NotificationEventPayload.SPACE_COMMUNICATION_MESSAGE_DIRECT;
}
