import { ICommunity } from '@domain/community/community/community.interface';
import { ActorType } from '@common/enums/actor.type';
import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputCommunityNewMember
  extends NotificationInputBase {
  actorId: string;
  actorType: ActorType;
  community: ICommunity;
}
