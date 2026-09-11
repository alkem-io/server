import { NotificationInputBase } from '../notification.dto.input.base';

/**
 * A response to a Space community invitation — accepted or declined — as
 * seen from the Space side. Actor-agnostic: `invitedActorID` is the
 * organization or user whose invitation was answered.
 *
 * `invitationCreatedBy` is provenance only — it records who sent the
 * invitation and does NOT scope the recipients. The event goes to every
 * admin of the Space (see
 * `NotificationSpaceAdapter.spaceAdminInvitationOutcome`), which is what
 * keeps it deliverable when the inviter has since been deleted or demoted,
 * and is why the field may legitimately be `''`.
 */
export interface NotificationInputSpaceCommunityInvitationOutcome
  extends NotificationInputBase {
  invitedActorID: string;
  spaceID: string;
  invitationCreatedBy: string; // The user who created/sent the invitation
}
