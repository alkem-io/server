import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputOrganizationMention
  extends NotificationInputBase {
  organizationID: string;
  roomID: string;
  messageID: string;
}
