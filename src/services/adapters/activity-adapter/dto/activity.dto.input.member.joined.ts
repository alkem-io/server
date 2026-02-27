import { IActor } from '@domain/actor/actor/actor.interface';
import { ICommunity } from '@domain/community/community';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputMemberJoined extends ActivityInputBase {
  community!: ICommunity;
  contributor!: IActor;
}
