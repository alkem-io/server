import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationPlatformForumDiscussionCreatedPayload
  extends InAppNotificationAdditionalData {
  discussionID: string;
}
