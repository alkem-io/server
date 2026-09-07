import { NotificationInputBase } from '../notification.dto.input.base';

/**
 * An organization has become a member of a Space by accepting an
 * invitation. Notifies every ADMIN of the organization — including
 * the one who accepted — so the rest of them know the invitation is
 * answered and no further action is needed.
 */
export interface NotificationInputOrganizationSpaceCommunityJoined
  extends NotificationInputBase {
  organizationID: string;
  spaceID: string;
}
