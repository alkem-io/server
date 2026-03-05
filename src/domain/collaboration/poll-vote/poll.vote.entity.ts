import { IPollOption } from '@domain/collaboration/poll-option/poll.option.interface';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';
import { Column, Entity, ManyToOne, Unique } from 'typeorm';
import { IPollVote } from './poll.vote.interface';

@Entity()
@Unique(['createdBy', 'poll'])
export class PollVote extends BaseAlkemioEntity implements IPollVote {
  @Column('uuid', { nullable: false })
  createdBy!: string;

  @Column('jsonb', { nullable: false })
  selectedOptionIds!: string[];

  @ManyToOne('Poll', 'votes', {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  poll?: unknown;

  // Derived — resolved by field resolver, not persisted
  selectedOptions?: IPollOption[];
}
