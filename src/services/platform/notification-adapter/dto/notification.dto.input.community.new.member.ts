import { ICommunity } from '@domain/community/community/community.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export class NotificationInputCommunityNewMember extends NotificationInputBase {
  community!: ICommunity;
}
