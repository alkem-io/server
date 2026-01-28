import { ForumDiscussionPrivacy } from '@common/enums/forum.discussion.privacy';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { Forum } from '@platform/forum/forum.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { Room } from '../../domain/communication/room/room.entity';
import { IDiscussion } from './discussion.interface';

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

  @Column('uuid', { nullable: false })
  createdBy!: string;

  @ManyToOne(
    () => Forum,
    communication => communication.discussions,
    {
      eager: false,
      cascade: false,
      onDelete: 'CASCADE',
    }
  )
  forum?: Forum;

  @Column('varchar', {
    length: 255,
    nullable: false,
    default: ForumDiscussionPrivacy.AUTHENTICATED,
  })
  privacy!: string;
}
