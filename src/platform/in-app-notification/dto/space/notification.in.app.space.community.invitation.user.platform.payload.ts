import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationSpaceCommunityInvitationUserPlatformPayload
  extends InAppNotificationAdditionalData {
  platformInvitationID: string;
}
