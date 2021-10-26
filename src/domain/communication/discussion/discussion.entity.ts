import { Column, Entity, ManyToOne } from 'typeorm';
import { IDiscussion } from './discussion.interface';
import { Communication } from '../communication/communication.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';

@Entity()
export class Discussion extends AuthorizableEntity implements IDiscussion {
  constructor(title?: string, category?: string) {
    super();
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

  @Column()
  discussionRoomID!: string;
}
