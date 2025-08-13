import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBaseOrganization } from './notification.in.app.payload.base.organization';

export interface InAppNotificationOrganizationMentionedPayload
  extends InAppNotificationPayloadBaseOrganization {
  type: NotificationEvent.ORGANIZATION_MENTIONED;
  commentID: string;
  commentContent: string;
  commentOrigin: {
    displayName: string;
    url: string;
  };
}
