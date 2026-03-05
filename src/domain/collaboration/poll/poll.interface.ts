import { PollResultsVisibility } from '@common/enums/poll.results.visibility';
import { PollStatus } from '@common/enums/poll.status';
import { IPollOption } from '@domain/collaboration/poll-option/poll.option.interface';
import { IPollVote } from '@domain/collaboration/poll-vote/poll.vote.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { IPollSettings } from './poll.settings.interface';

@ObjectType('Poll')
export abstract class IPoll extends IAuthorizable {
  @Field(() => String, { nullable: false, description: 'Poll title.' })
  title!: string;

  @Field(() => PollStatus, {
    nullable: false,
    description:
      'Current lifecycle status of this poll. Always OPEN in this iteration; CLOSED reserved for future use.',
  })
  status!: PollStatus;

  @Field(() => IPollSettings, {
    nullable: false,
    description:
      'Configuration settings for this poll (immutable after creation).',
  })
  settings!: IPollSettings;

  @Field(() => Date, {
    nullable: true,
    description:
      '[Future] Date/time after which the poll automatically closes. Always null in this iteration.',
  })
  deadline?: Date;

  @Field(() => Int, {
    nullable: true,
    description:
      'Total number of votes cast on this poll. Null when resultsVisibility = HIDDEN and the current user has not voted.',
  })
  totalVotes?: number;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether the current user can see detailed results (visibility gate passed).',
  })
  canSeeDetailedResults?: boolean;

  @Field(() => [IPollOption], {
    nullable: false,
    description:
      'The selectable options for this poll, ordered by vote count (most votes first), with ties broken by sortOrder ascending.',
  })
  options?: IPollOption[];

  @Field(() => IPollVote, {
    nullable: true,
    description:
      "The current user's vote on this poll, or null if the current user has not voted.",
  })
  myVote?: IPollVote;

  // Internal — not exposed directly
  votes?: IPollVote[];
  framing?: unknown;

  // Used internally for visibility gate computation
  resultsVisibility?: PollResultsVisibility;
}
