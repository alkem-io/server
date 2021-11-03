import { Column, Entity, ManyToOne } from 'typeorm';
import { IDiscussion } from './discussion.interface';
import { Communication } from '../communication/communication.entity';
import { RoomableEntity } from '../room/roomable.entity';

@Entity()
export class Discussion extends RoomableEntity implements IDiscussion {
  constructor(
    communicationGroupID: string,
    displayName: string,
    title?: string,
    category?: string
  ) {
    super(communicationGroupID, displayName);
    this.title = title || '';
    this.category = category || '';
  }

  @Column('text', { nullable: false })
  title!: string;

  @Column('text', { nullable: false })
  category!: string;

  @ManyToOne(() => Communication, communication => communication.discussions, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  communication?: Communication;
}
