import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { IPost } from './post.interface';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { Room } from '@domain/communication/room/room.entity';

import { CalloutContribution } from '../callout-contribution/callout.contribution.entity';

@Entity()
export class Post extends NameableEntity implements IPost {
  @Column('uuid', { nullable: false })
  createdBy!: string;

  @OneToOne(() => Room, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  comments!: Room;

  @OneToOne(() => CalloutContribution, contribution => contribution.post)
  contribution?: CalloutContribution;

  constructor() {
    super();
  }
}
