import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { IDiscussion } from './discussion.interface';
import { Communication } from '../communication/communication.entity';
import { Room } from '../room/room.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { User } from '@domain/community/user/user.entity';

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

  @OneToOne(() => User, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'createdBy' })
  createdBy!: string;

  @ManyToOne(() => Communication, communication => communication.discussions, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  communication?: Communication;
}
