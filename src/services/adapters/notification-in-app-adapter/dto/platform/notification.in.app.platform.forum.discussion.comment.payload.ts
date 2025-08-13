import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from '../notification.in.app.payload.base';

export interface InAppNotificationPlatformForumDiscussionCommentPayload
  extends InAppNotificationPayloadBase {
  type: NotificationEvent.PLATFORM_FORUM_DISCUSSION_COMMENT;
  discussionID: string;
  commentID: string;
}
