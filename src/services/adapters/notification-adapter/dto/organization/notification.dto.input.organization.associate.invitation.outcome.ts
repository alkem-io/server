import { RoleName } from '@common/enums/role.name';
import { NotificationInputBase } from '../notification.dto.input.base';

/**
 * An invitee accepted or declined an invitation to associate with the
 * organization (the caller selects the event). Every ADMIN other than the
 * acting user (the invitee) is notified — resolved and excluded downstream
 * by the adapter/recipients pipeline, not here.
 */
export interface NotificationInputOrganizationAssociateInvitationOutcome
  extends NotificationInputBase {
  organizationID: string;
  invitationID: string;
  inviteeID: string;
  extraRoles: RoleName[];
  // Accepted only: extra roles offered that could not be granted (cap
  // consumed meanwhile). Empty/undefined for a decline.
  extraRolesWithheld?: RoleName[];
}
