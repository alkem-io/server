import { IInAppNotificationPayload } from '@services/api/in-app-notification-reader/dto/in.app.notification.payload.interface';
import { InAppNotificationPayload } from '../in.app.notification.payload.base';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('InAppNotificationPayloadPlatformForumDiscussionComment', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadPlatformForumDiscussionComment extends InAppNotificationPayload {
  discussionID!: string;
  commentID!: string;
}
