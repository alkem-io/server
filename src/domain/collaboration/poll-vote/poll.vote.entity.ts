import { IPollOption } from '@domain/collaboration/poll-option/poll.option.interface';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';
import { User } from '@domain/community/user/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { IPoll } from '../poll/poll.interface';
import { IPollVote } from './poll.vote.interface';

@Entity()
@Unique(['createdBy', 'poll'])
export class PollVote extends BaseAlkemioEntity implements IPollVote {
  @Column('uuid', { nullable: false })
  createdBy!: string;

  @ManyToOne(() => User, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'createdBy' })
  createdByUser?: User;

  // Stored as JSONB (no FK to poll_option) by design. Orphaned IDs are prevented by:
  // - removeOption/updateOption delete affected votes in a transaction
  // - ON DELETE CASCADE on the poll FK cleans up votes when a poll is deleted
  // - Field resolvers filter out any missing option IDs before returning to clients
  @Column('jsonb', { nullable: false })
  selectedOptionIds!: string[];

  @Index()
  @ManyToOne('Poll', 'votes', {
    nullable: false,
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  poll?: IPoll;

  // Derived — resolved by field resolver, not persisted
  selectedOptions?: IPollOption[];
}
