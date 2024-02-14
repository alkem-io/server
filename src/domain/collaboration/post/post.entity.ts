import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { IPost } from './post.interface';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { Room } from '@domain/communication/room/room.entity';
import { User } from '@domain/community/user/user.entity';

@Entity()
export class Post extends NameableEntity implements IPost {
  @Column('text')
  type!: string;

  @OneToOne(() => User, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'createdBy' })
  createdBy!: string;

  @OneToOne(() => Room, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  comments!: Room;

  constructor() {
    super();
  }
}
