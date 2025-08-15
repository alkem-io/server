import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationPlatformForumDiscussionCommentPayload
  extends InAppNotificationAdditionalData {
  discussionID: string;
  commentID: string;
}
