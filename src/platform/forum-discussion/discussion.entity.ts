import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { Forum } from '@platform/forum/forum.entity';
import { Room } from '../../domain/communication/room/room.entity';
import { IDiscussion } from './discussion.interface';

export class Discussion extends NameableEntity implements IDiscussion {
  category!: string;

  comments!: Room;

  createdBy!: string;

  forum?: Forum;

  privacy!: string;
}
