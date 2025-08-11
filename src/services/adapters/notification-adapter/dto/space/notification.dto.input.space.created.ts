import { ICommunity } from '@domain/community/community';
import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputSpaceCreated extends NotificationInputBase {
  community: ICommunity;
}
