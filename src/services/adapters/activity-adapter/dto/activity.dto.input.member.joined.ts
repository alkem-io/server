import { ICommunity } from '@domain/community/community';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ActivityInputBase } from './activity.dto.input.base';

export class ActivityInputMemberJoined extends ActivityInputBase {
  community!: ICommunity;
  contributor!: IContributor;
}
