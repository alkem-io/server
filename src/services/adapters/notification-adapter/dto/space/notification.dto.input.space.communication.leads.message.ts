import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputCommunicationLeadsMessage
  extends NotificationInputBase {
  message: string;
  communityID: string;
}
