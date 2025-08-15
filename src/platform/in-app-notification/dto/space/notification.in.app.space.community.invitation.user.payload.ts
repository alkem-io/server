import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationSpaceCommunityInvitationUserPayload
  extends InAppNotificationAdditionalData {
  invitationID: string;
}
