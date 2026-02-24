import { ActorType } from '@common/enums/actor.type';
import { ICommunity } from '@domain/community/community/community.interface';
import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputCommunityNewMember
  extends NotificationInputBase {
  actorID: string;
  actorType: ActorType;
  community: ICommunity;
}
