import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { ActorContext } from '@core/actor-context/actor.context';
import { PollOption } from '@domain/collaboration/poll-option/poll.option.entity';
import { IPollOption } from '@domain/collaboration/poll-option/poll.option.interface';
import { IPollVote } from '@domain/collaboration/poll-vote/poll.vote.interface';
import { PollVoteService } from '@domain/collaboration/poll-vote/poll.vote.service';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Poll } from './poll.entity';
import { IPoll } from './poll.interface';
import { PollService } from './poll.service';

@Resolver(() => IPoll)
export class PollFieldsResolver {
  constructor(
    private readonly pollService: PollService,
    private readonly pollVoteService: PollVoteService
  ) {}

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

    const vote = await this.pollVoteService.getVoteForUser(
      poll.id,
      actorContext.actorID
    );

    if (!vote) return null;

    // Resolve selectedOptions from the poll's options list
    const pollWithOptions = await this.pollService.getPollOrFail(poll.id);
    const optionsMap = new Map(
      (pollWithOptions.options ?? []).map(o => [o.id, o])
    );

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
    const fullPoll = await this.pollService.getPollOrFail(poll.id);
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
    // Load full poll with votes and options to compute results
    const fullPoll = await this.pollService.getPollOrFail(poll.id);
    const vote = userId
      ? await this.pollVoteService.getVoteForUser(poll.id, userId)
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
    const fullPoll = await this.pollService.getPollOrFail(poll.id);
    const vote = userId
      ? await this.pollVoteService.getVoteForUser(poll.id, userId)
      : null;
    const hasVoted = vote !== null;

    return this.pollService.getTotalVotes(fullPoll, hasVoted);
  }
}
