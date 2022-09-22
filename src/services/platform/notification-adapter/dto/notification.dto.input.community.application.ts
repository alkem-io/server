import { ICommunity } from '@domain/community/community/community.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputCommunityApplication
  extends NotificationInputBase {
  community: ICommunity;
}
