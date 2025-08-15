import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationSpaceCommunityNewMemberPayload
  extends InAppNotificationAdditionalData {
  contributorType: string;
  newMemberID: string;
}
