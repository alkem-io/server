import { InAppNotificationPayloadSpaceBase } from './notification.in.app.payload.space.base';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';
@ObjectType('InAppNotificationPayloadSpaceCommunicationUpdate', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCommunicationUpdate extends InAppNotificationPayloadSpaceBase {
  update!: string;
  messageID!: string;
  declare type: NotificationEventPayload.SPACE_COMMUNICATION_UPDATE;
}
