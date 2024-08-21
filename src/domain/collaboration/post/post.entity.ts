import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { IPost } from './post.interface';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { Room } from '@domain/communication/room/room.entity';
import { UUID_LENGTH } from '@common/constants';

@Entity()
export class Post extends NameableEntity implements IPost {
  @Column('text')
  type!: string;

  @Column('char', { length: UUID_LENGTH, nullable: true })
  createdBy?: string;

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
