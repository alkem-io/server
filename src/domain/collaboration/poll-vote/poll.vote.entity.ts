import { IPollOption } from '@domain/collaboration/poll-option/poll.option.interface';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';
import { User } from '@domain/community/user/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
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
