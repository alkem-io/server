import { NotificationInputBase } from '../notification.dto.input.base';

/**
 * A response to a Space community invitation — accepted or declined — as
 * seen from the Space side. Actor-agnostic: `invitedActorID` is the
 * organization or user whose invitation was answered, and
 * `invitationCreatedBy` is the Space admin who sent it and who is notified.
 */
export interface NotificationInputSpaceCommunityInvitationOutcome
  extends NotificationInputBase {
  invitedActorID: string;
  spaceID: string;
  invitationCreatedBy: string; // The user who created/sent the invitation
}
