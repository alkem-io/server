import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('InAppNotificationPayloadPlatformForumDiscussionComment', {
  implements: () => IInAppNotificationPayload,
})
export abstract class InAppNotificationPayloadPlatformForumDiscussionComment extends IInAppNotificationPayload {
  discussionID!: string;
  commentID!: string;
}
