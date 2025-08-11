import { InAppNotificationPayloadBase } from './notification.in.app.payload.base';
import { NotificationEvent } from '@common/enums/notification.event';

export interface InAppNotificationContributorMentionedPayload
  extends InAppNotificationPayloadBase {
  type: NotificationEvent.USER_MENTION;
  comment: string; // probably will be removed; can be too large; can be replaced with roomID, commentID
  contributorType: string;
  commentOrigin: {
    displayName: string;
    url: string;
  };
}
