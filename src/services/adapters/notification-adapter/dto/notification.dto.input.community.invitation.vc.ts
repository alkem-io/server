import { IContributor } from '@domain/community/contributor/contributor.interface';
import { NotificationInputCommunityInvitation } from './notification.dto.input.community.invitation';

export interface NotificationInputCommunityInvitationVirtualContributor
  extends NotificationInputCommunityInvitation {
  accountHost: IContributor;
}
