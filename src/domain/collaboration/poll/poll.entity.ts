import { ENUM_LENGTH, MID_TEXT_LENGTH } from '@common/constants';
import { PollStatus } from '@common/enums/poll.status';
import { PollOption } from '@domain/collaboration/poll-option/poll.option.entity';
import { PollVote } from '@domain/collaboration/poll-vote/poll.vote.entity';
import { IPollVote } from '@domain/collaboration/poll-vote/poll.vote.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Column, Entity, OneToMany, OneToOne } from 'typeorm';
import { IPoll } from './poll.interface';
import { IPollSettings } from './poll.settings.interface';

@Entity()
export class Poll extends AuthorizableEntity implements IPoll {
  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: false })
  title!: string;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  status!: PollStatus;

  @Column('jsonb', { nullable: false })
  settings!: IPollSettings;

  @Column('timestamp', { nullable: true })
  deadline?: Date;

  @OneToMany(
    () => PollOption,
    option => option.poll,
    {
      eager: false,
      cascade: true,
    }
  )
  options?: PollOption[];

  @OneToMany(
    () => PollVote,
    vote => vote.poll,
    {
      eager: false,
      cascade: true,
    }
  )
  votes?: PollVote[];

  @OneToOne('CalloutFraming', 'poll')
  framing?: unknown;

  // Derived — not persisted; computed by field resolvers
  totalVotes?: number;
  canSeeDetailedResults?: boolean;
  myVote?: IPollVote;
}
