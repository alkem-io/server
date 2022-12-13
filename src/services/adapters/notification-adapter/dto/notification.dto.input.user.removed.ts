import { IUser } from '@domain/community/user/user.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputUserRemoved extends NotificationInputBase {
  user: IUser;
}
