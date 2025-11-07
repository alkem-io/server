import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
import { InAppNotificationPayloadSpaceBase } from './notification.in.app.payload.space.base';
import { NotificationEventPayload } from '@common/enums/notification.event.payload';

@ObjectType('InAppNotificationPayloadSpaceCollaborationCalloutComment', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCollaborationCalloutComment extends InAppNotificationPayloadSpaceBase {
  calloutID!: string;
  contributionID!: string; // in case of a comment on a callout, this is the triggeredBy
  messageID!: string;
  roomID!: string;
  declare type: NotificationEventPayload.SPACE_COLLABORATION_CALLOUT_COMMENT;
}
