import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
import { InAppNotificationPayloadSpace } from './notification.in.app.payload.space.base';

@ObjectType('InAppNotificationPayloadSpaceCollaborationCalloutPostComment', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCollaborationCalloutPostComment extends InAppNotificationPayloadSpace {
  calloutID!: string;
  contributionID!: string;
  messageID!: string;
  roomID!: string;
}
