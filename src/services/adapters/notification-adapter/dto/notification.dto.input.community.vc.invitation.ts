import { ICommunity } from '@domain/community/community/community.interface';
import { NotificationInputBase } from './notification.dto.input.base';
import { IAccount } from '@domain/space/account/account.interface';

export interface NotificationInputCommunityVirtualContributorInvitation
  extends NotificationInputBase {
  community: ICommunity;
  account: IAccount;
  virtualContributorID: string;
}
