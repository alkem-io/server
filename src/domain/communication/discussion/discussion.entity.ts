import { Column, Entity, ManyToOne } from 'typeorm';
import { IDiscussion } from './discussion.interface';
import { Communication } from '../communication/communication.entity';
import { RoomableNameableEntity } from '../room/roomable.nameable.entity';

@Entity()
export class Discussion extends RoomableNameableEntity implements IDiscussion {
  @Column('text', { nullable: false })
  category!: string;

  @Column('int', { nullable: false })
  commentsCount!: number;

  @Column('char', { length: 36, nullable: true })
  createdBy!: string;

  @ManyToOne(() => Communication, communication => communication.discussions, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  communication?: Communication;
}
