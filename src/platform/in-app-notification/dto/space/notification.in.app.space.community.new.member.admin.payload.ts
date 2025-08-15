import { InAppNotificationAdditionalData } from '../in.app.notification.additional.data';

export interface InAppNotificationSpaceCommunityNewMemberAdminPayload
  extends InAppNotificationAdditionalData {
  newMemberID: string;
  contributorType: string;
}
