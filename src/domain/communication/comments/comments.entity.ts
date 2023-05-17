import { Column, Entity } from 'typeorm';
import { IComments } from './comments.interface';
import { RoomableEntity } from '../room/roomable.entity';

@Entity()
export class Comments extends RoomableEntity implements IComments {
  constructor(displayName: string) {
    super(displayName);
    this.commentsCount = 0;
  }

  @Column('int', { nullable: false })
  commentsCount!: number;
}
