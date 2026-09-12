import { NotificationInputBase } from '../notification.dto.input.base';

/**
 * An organization decided on the applicant's own application to associate
 * (approved or declined — the caller selects the event).
 */
export interface NotificationInputOrganizationAssociateApplicationDecided
  extends NotificationInputBase {
  organizationID: string;
  applicationID: string;
  applicantID: string;
}
