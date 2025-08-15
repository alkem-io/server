import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationOrganizationMentionedPayload
  extends InAppNotificationAdditionalData {
  commentID: string;
  commentContent: string;
  commentOriginDisplayName: string;
  commentOriginUrl: string;
}
