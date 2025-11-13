import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
import { InAppNotificationPayloadSpaceBase } from './notification.in.app.payload.space.base';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';

@ObjectType('InAppNotificationPayloadSpaceCollaborationCalloutPostComment', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCollaborationCalloutPostComment extends InAppNotificationPayloadSpaceBase {
  calloutID!: string;
  contributionID!: string;
  messageID!: string;
  roomID!: string;
  declare type: NotificationEventPayload.SPACE_COLLABORATION_CALLOUT_POST_COMMENT;
}
