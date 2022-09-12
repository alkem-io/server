import { IUser } from '@domain/community';
import { ICommunity } from '@domain/community/community';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputMemberJoined extends ActivityInputBase {
  community!: ICommunity;
  user!: IUser;
}
