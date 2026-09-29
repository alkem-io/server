import { NotificationInputBase } from '../notification.dto.input.base';

/**
 * A user applied to associate with the organization. Every ADMIN is
 * notified; when the organization has zero admins the email escalates to
 * platform support instead (061 zero-admin machinery reused unchanged).
 */
export interface NotificationInputOrganizationAssociateApplicationCreated
  extends NotificationInputBase {
  organizationID: string;
  applicationID: string;
  applicantID: string;
  applicationMessage?: string;
  organizationHasNoAdministrators: boolean;
}
