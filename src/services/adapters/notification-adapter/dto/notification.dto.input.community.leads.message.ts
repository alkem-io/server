import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputCommunityLeadsMessage
  extends NotificationInputBase {
  message: string;
  communityID: string;
}
