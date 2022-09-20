import { ICommunity } from '@domain/community/community/community.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputCommunityNewMember
  extends NotificationInputBase {
  community: ICommunity;
}
