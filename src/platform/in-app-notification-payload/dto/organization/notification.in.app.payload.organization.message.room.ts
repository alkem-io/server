import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadOrganization } from './notification.in.app.payload.organization.base';
import { ObjectType } from '@nestjs/graphql';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';

@ObjectType('InAppNotificationPayloadOrganizationMessageRoom', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadOrganizationMessageRoom extends InAppNotificationPayloadOrganization {
  messageID!: string;
  roomID!: string;
  declare type: NotificationEventPayload.ORGANIZATION_MESSAGE_ROOM;
}
