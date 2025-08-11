import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBase } from './in.app.notification.receiver.payload.base';

export interface InAppNotificationCommunityNewMemberPayload
  extends InAppNotificationPayloadBase {
  type: NotificationEvent.SPACE_COMMUNITY_NEW_MEMBER;
  contributorType: string;
  newMemberID: string;
  spaceID: string;
}
