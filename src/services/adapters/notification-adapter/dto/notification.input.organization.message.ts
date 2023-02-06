import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputOrganizationMessage
  extends NotificationInputBase {
  message: string;
  organizationID: string;
}
