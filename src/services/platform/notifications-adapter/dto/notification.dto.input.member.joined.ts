import { IUser } from '@domain/community';
import { ICommunity } from '@domain/community/community';
import { NotificationInputBase } from './notification.dto.input.base';

export class NotificationInputMemberJoined extends NotificationInputBase {
  community!: ICommunity;
  user!: IUser;
}
