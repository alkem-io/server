import { RoomType } from '@common/enums/room.type';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Post } from '@domain/collaboration/post/post.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { VcInteractionsByThread } from '../vc-interaction/vc.interaction.entity';
import { IRoom } from './room.interface';

export class Room extends AuthorizableEntity implements IRoom {
  messagesCount!: number;

  type!: RoomType;

  displayName!: string;

  vcInteractionsByThread!: VcInteractionsByThread;

  callout?: Callout;

  post?: Post;

  constructor(displayName: string, type: RoomType) {
    super();
    this.type = type;
    this.displayName = displayName;
    this.messagesCount = 0;
    this.vcInteractionsByThread = {};
  }
}
