import { ICommunity } from '@domain/community/community/community.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputCommunityInvitationExternal
  extends NotificationInputBase {
  community: ICommunity;
  invitedUser: string;
  welcomeMessage?: string;
}
