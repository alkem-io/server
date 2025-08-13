import { NotificationEvent } from '@common/enums/notification.event';
import { InAppNotificationPayloadBaseSpace } from './notification.in.app.payload.space.base';

export interface InAppNotificationSpaceCommunityInvitationVcPayload
  extends InAppNotificationPayloadBaseSpace {
  type: NotificationEvent.SPACE_COMMUNITY_INVITATION_VC;
  invitationID: string;
  inviterID: string;
  inviterDisplayName: string;
  virtualContributorID: string;
  virtualContributorDisplayName: string;
}
