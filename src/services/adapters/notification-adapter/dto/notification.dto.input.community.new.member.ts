import { ICommunity } from '@domain/community/community/community.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputCommunityNewMember
  extends NotificationInputBase {
  userID: string;
  community: ICommunity;
}
