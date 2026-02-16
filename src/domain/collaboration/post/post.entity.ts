import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { Room } from '@domain/communication/room/room.entity';
import { CalloutContribution } from '../callout-contribution/callout.contribution.entity';
import { IPost } from './post.interface';

export class Post extends NameableEntity implements IPost {
  createdBy!: string;

  comments!: Room;

  contribution?: CalloutContribution;

  constructor() {
    super();
  }
}
