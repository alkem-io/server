import { ICommunity } from '@domain/community/community/community.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputPlatformInvitation
  extends NotificationInputBase {
  community: ICommunity;
  invitedUser: string;
  welcomeMessage?: string;
}
