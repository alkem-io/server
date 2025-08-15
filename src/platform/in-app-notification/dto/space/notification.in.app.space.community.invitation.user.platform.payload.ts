import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBaseSpace } from './notification.in.app.payload.space.base';

export interface InAppNotificationSpaceCommunityInvitationUserPlatformPayload
  extends InAppNotificationPayloadBaseSpace {
  type: NotificationEvent.SPACE_COMMUNITY_INVITATION_USER_PLATFORM;
  platformInvitationID: string;
}
