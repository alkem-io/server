import { InAppNotificationEventType } from '@common/enums/in.app.notification.event.type';
import { InAppNotificationPayloadBase } from './notification.in.app.payload.base';

export interface InAppNotificationContributorMentionedPayload
  extends InAppNotificationPayloadBase {
  type: InAppNotificationEventType.COMMUNICATION_USER_MENTION;
  comment: string; // probably will be removed; can be too large; can be replaced with roomID, commentID
  contributorType: string;
  commentOrigin: {
    displayName: string;
    url: string;
  };
}
