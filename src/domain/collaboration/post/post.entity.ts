import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { IPost } from './post.interface';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { Room } from '@domain/communication/room/room.entity';

@Entity()
export class Post extends NameableEntity implements IPost {
  @Column('text')
  type!: string;

  @Column('char', { length: 36, nullable: true })
  createdBy!: string;

  @OneToOne(() => Room, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  comments!: Room;

  @ManyToOne(() => Callout, callout => callout.posts, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  callout?: Callout;

  constructor() {
    super();
  }
}
