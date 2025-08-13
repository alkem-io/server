import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from './notification.in.app.payload.base';
export interface InAppNotificationSpaceCommunityNewMemberPayload
  extends InAppNotificationPayloadBase {
  type: NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER;
  contributorType: string;
  newMemberID: string;
  spaceID: string;
}
