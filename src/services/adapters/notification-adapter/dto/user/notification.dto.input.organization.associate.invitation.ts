import { RoleName } from '@common/enums/role.name';
import { NotificationInputBase } from '../notification.dto.input.base';

/**
 * A user has been invited to associate with an organization. Naming the
 * organization, the offered extra role(s), and the message.
 */
export interface NotificationInputOrganizationAssociateInvitation
  extends NotificationInputBase {
  organizationID: string;
  invitationID: string;
  inviteeID: string;
  extraRoles: RoleName[];
  welcomeMessage?: string;
}
