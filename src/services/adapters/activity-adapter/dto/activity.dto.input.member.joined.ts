import { ICommunity } from '@domain/community/community';
import { ActivityInputBase } from './activity.dto.input.base';
import { IContributor } from '@domain/community/contributor/contributor.interface';

export class ActivityInputMemberJoined extends ActivityInputBase {
  community!: ICommunity;
  contributor!: IContributor;
}
