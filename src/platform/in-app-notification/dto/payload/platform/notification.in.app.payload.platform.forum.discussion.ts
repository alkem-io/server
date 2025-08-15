import { InAppNotificationPayload } from '../in.app.notification.payload.base';

export interface InAppNotificationPlatformForumDiscussionCreatedPayload
  extends InAppNotificationPayload {
  discussionID: string;
}
