import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { PollOption } from '@domain/collaboration/poll-option/poll.option.entity';
import { IPollOption } from '@domain/collaboration/poll-option/poll.option.interface';
import { IPollVote } from '@domain/collaboration/poll-vote/poll.vote.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { PollDataLoader } from './poll.data.loader';
import { Poll } from './poll.entity';
import { IPoll } from './poll.interface';
import { PollService } from './poll.service';

@InstrumentResolver()
@Resolver(() => IPoll)
export class PollFieldsResolver {
  constructor(
    private readonly pollService: PollService,
    private readonly pollDataLoader: PollDataLoader
  ) {}

  private async getFullPollOrFail(pollId: string): Promise<Poll> {
    const poll = await this.pollDataLoader.loadPoll(pollId);
    if (!poll) {
      throw new EntityNotFoundException(
        'Poll not found',
        LogContext.COLLABORATION,
        { pollId }
      );
    }
    return poll;
  }

  @ResolveField('myVote', () => IPollVote, {
    nullable: true,
    description:
      "The current user's vote on this poll, or null if the current user has not voted.",
  })
  async myVote(
    @Parent() poll: Poll,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IPollVote | null> {
    if (!actorContext?.actorID) return null;

    const vote = await this.pollDataLoader.loadUserVote(
      poll.id,
      actorContext.actorID
    );
    if (!vote) return null;

    // Resolve selectedOptions from the poll's options list
    const fullPoll = await this.getFullPollOrFail(poll.id);
    const optionsMap = new Map((fullPoll.options ?? []).map(o => [o.id, o]));

    const selectedOptions: IPollOption[] = vote.selectedOptionIds
      .map(id => optionsMap.get(id))
      .filter((o): o is PollOption => o !== undefined);

    return {
      id: vote.id,
      createdDate: vote.createdDate,
      updatedDate: vote.updatedDate,
      createdBy: vote.createdBy,
      selectedOptions,
    };
  }

  @ResolveField('canSeeDetailedResults', () => Boolean, {
    nullable: false,
    description:
      'Whether the current user can see detailed results (visibility gate passed).',
  })
  async canSeeDetailedResults(
    @Parent() poll: Poll,
    @CurrentActor() actorContext: ActorContext
  ): Promise<boolean> {
    const userId = actorContext?.actorID ?? '';
    const fullPoll = await this.getFullPollOrFail(poll.id);
    return this.pollService.canUserSeeDetailedResults(fullPoll, userId);
  }

  @ResolveField('options', () => [IPollOption], {
    nullable: false,
    description:
      'The selectable options for this poll, always ordered by sortOrder ascending.',
  })
  async options(
    @Parent() poll: Poll,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IPollOption[]> {
    const userId = actorContext?.actorID ?? '';
    const fullPoll = await this.getFullPollOrFail(poll.id);
    const vote = userId
      ? await this.pollDataLoader.loadUserVote(poll.id, userId)
      : null;
    const hasVoted = vote !== null;

    const enrichedOptions = this.pollService.computePollResults(fullPoll);

    return this.pollService.applyVisibilityRules(
      enrichedOptions,
      fullPoll,
      hasVoted
    );
  }

  @ResolveField('totalVotes', () => Number, {
    nullable: true,
    description:
      'Total number of votes cast on this poll. Null when HIDDEN and user has not voted.',
  })
  async totalVotes(
    @Parent() poll: Poll,
    @CurrentActor() actorContext: ActorContext
  ): Promise<number | null> {
    const userId = actorContext?.actorID ?? '';
    const fullPoll = await this.getFullPollOrFail(poll.id);
    const vote = userId
      ? await this.pollDataLoader.loadUserVote(poll.id, userId)
      : null;
    const hasVoted = vote !== null;

    return this.pollService.getTotalVotes(fullPoll, hasVoted);
  }
}
