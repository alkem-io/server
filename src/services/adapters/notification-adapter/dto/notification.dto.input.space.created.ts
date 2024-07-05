import { ICommunity } from '@domain/community/community';
import { NotificationInputBase } from './notification.dto.input.base';
import { IAccount } from '@domain/space/account/account.interface';

export interface NotificationInputSpaceCreated extends NotificationInputBase {
  community: ICommunity;
  account: IAccount;
}
