import { ICommunity } from '@domain/community/community/community.interface';
import { NotificationInputBase } from '../notification.dto.input.base';
import { IApplication } from '@domain/access/application';

export interface NotificationInputCommunityApplication
  extends NotificationInputBase {
  community: ICommunity;
  application: IApplication;
}
