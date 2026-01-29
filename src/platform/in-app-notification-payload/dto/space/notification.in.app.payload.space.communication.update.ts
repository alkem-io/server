import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { ObjectType } from '@nestjs/graphql';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadSpaceBase } from './notification.in.app.payload.space.base';
@ObjectType('InAppNotificationPayloadSpaceCommunicationUpdate', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunicationUpdate extends InAppNotificationPayloadSpaceBase {
  update!: string;
  messageID!: string;
  declare type: NotificationEventPayload.SPACE_COMMUNICATION_UPDATE;
}
