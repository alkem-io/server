import { InAppNotificationPayloadBase } from './notification.in.app.payload.base';
import { InAppNotificationEventType } from '@common/enums/in.app.notification.event.type';

export interface InAppNotificationCommunityNewMemberPayload
  extends InAppNotificationPayloadBase {
  type: InAppNotificationEventType.COMMUNITY_NEW_MEMBER;
  contributorType: string;
  newMemberID: string;
  spaceID: string;
}
