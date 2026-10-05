import { RoleName } from '@common/enums/role.name';
import { NotificationInputBase } from '../notification.dto.input.base';

/**
 * An organization admin invited an email address that has no account yet.
 * Email-only: there is no recipient lookup, in-app or push delivery because
 * the invitee is not a platform user.
 */
export interface NotificationInputOrganizationAssociatePlatformInvitation
  extends NotificationInputBase {
  organizationID: string;
  invitedUserEmail: string;
  extraRoles: RoleName[];
  welcomeMessage?: string;
}
