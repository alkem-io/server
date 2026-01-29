import { NotificationEventPayload } from '@common/enums/notification.event.payload';
import { ObjectType } from '@nestjs/graphql';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { InAppNotificationPayloadSpaceBase } from './notification.in.app.payload.space.base';
@ObjectType('InAppNotificationPayloadSpaceCollaborationCallout', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCollaborationCallout extends InAppNotificationPayloadSpaceBase {
  calloutID!: string;
  contributionID?: string;
  messageID?: string;
  declare type: NotificationEventPayload.SPACE_COLLABORATION_CALLOUT;
}
