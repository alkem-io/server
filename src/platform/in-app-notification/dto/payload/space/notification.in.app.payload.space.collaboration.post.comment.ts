import { InAppNotificationPayloadSpace } from './notification.in.app.payload.space.base';
import { IInAppNotificationPayload } from '@services/api/in-app-notification-reader/dto/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';
@ObjectType('InAppNotificationPayloadSpaceCollaborationPostComment', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadSpaceCollaborationPostComment extends InAppNotificationPayloadSpace {
  calloutID!: string;
  postID!: string;
  messageID!: string;
}
