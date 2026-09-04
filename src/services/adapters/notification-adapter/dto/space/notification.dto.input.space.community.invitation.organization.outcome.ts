import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputSpaceCommunityInvitationOrganizationOutcome
  extends NotificationInputBase {
  organizationID: string;
  spaceID: string;
  invitationCreatedBy: string; // The user who created/sent the invitation
}
