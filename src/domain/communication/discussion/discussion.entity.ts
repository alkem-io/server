import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { IDiscussion } from './discussion.interface';
import { Communication } from '../communication/communication.entity';
import { Room } from '../room/room.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { CommunicationDiscussionPrivacy } from '@common/enums/communication.discussion.privacy';

@Entity()
export class Discussion extends NameableEntity implements IDiscussion {
  @Column('text', { nullable: false })
  category!: string;

  @OneToOne(() => Room, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  comments!: Room;

  @Column('char', { length: 36, nullable: true })
  createdBy!: string;

  @ManyToOne(() => Communication, communication => communication.discussions, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  communication?: Communication;

  @Column('varchar', {
    length: 255,
    nullable: false,
    default: CommunicationDiscussionPrivacy.AUTHENTICATED,
  })
  privacy!: string;
}
