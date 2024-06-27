import { ICommunity } from '@domain/community/community/community.interface';
import { NotificationInputBase } from './notification.dto.input.base';
import { IContributor } from '@domain/community/contributor/contributor.interface';

export interface NotificationInputCommunityVirtualContributorInvitation
  extends NotificationInputBase {
  community: ICommunity;
  accountHost: IContributor;
  virtualContributorID: string;
}
