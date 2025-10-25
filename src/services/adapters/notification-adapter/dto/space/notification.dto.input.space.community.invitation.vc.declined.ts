import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputVirtualContributorSpaceCommunityInvitationDeclined
  extends NotificationInputBase {
  virtualContributorID: string;
  spaceID: string;
  invitationCreatedBy: string; // The user who created/sent the invitation
}
