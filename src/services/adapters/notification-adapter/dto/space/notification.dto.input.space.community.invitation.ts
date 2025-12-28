import { ICommunity } from '@domain/community/community/community.interface';
import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputCommunityInvitation
  extends NotificationInputBase {
  community: ICommunity;
  invitationID: string;
  invitedActorId: string;
  welcomeMessage?: string;
}
