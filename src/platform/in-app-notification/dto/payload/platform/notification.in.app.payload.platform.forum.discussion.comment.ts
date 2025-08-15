import { InAppNotificationPayload } from '../in.app.notification.payload.base';

export class InAppNotificationPlatformForumDiscussionCommentPayload extends InAppNotificationPayload {
  discussionID!: string;
  commentID!: string;
}
