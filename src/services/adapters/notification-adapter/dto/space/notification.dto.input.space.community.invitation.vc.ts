import { IActor } from '@domain/actor/actor/actor.interface';
import { NotificationInputCommunityInvitation } from './notification.dto.input.space.community.invitation';

export interface NotificationInputCommunityInvitationVirtualContributor
  extends NotificationInputCommunityInvitation {
  accountHost: IActor;
}
