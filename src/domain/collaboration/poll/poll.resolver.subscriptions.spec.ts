import { PollResultsDetail } from '@common/enums/poll.results.detail';
import { PollResultsVisibility } from '@common/enums/poll.results.visibility';
import { createMock } from '@golevelup/ts-vitest';
import { SUBSCRIPTION_OPTIONS_METADATA } from '@nestjs/graphql/dist/graphql.constants';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service/subscription.read.service';
import { PollSubscriptionPayload } from './dto/poll.subscription.payload';
import { PollResolverSubscriptions } from './poll.resolver.subscriptions';
import { PollService } from './poll.service';

describe('PollResolverSubscriptions', () => {
  const createResolver = () => {
    const logger = {
      debug: vi.fn(),
      verbose: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const subscriptionService = createMock<SubscriptionReadService>();
    const pollService = createMock<PollService>();
    const pollVoteService = createMock<any>();
    const authorizationService = createMock<any>();

    const resolver = new PollResolverSubscriptions(
      logger as any,
      subscriptionService,
      pollService,
      pollVoteService,
      authorizationService
    );

    return {
      resolver,
      pollService,
      pollVoteService,
    };
  };

  const getPollVoteUpdatedResolve = () => {
    const metadata = Reflect.getMetadata(
      SUBSCRIPTION_OPTIONS_METADATA,
      PollResolverSubscriptions.prototype.pollVoteUpdated
    ) as {
      resolve: (
        payload: PollSubscriptionPayload,
        args: { pollID: string },
        context: { req: { user?: { actorID?: string } } }
      ) => Promise<unknown>;
    };

    return metadata.resolve;
  };

  const basePayload: PollSubscriptionPayload = {
    eventID: 'evt-1',
    pollEventType: 'POLL_VOTE_UPDATED' as any,
    poll: {
      id: 'poll-1',
      createdDate: new Date('2026-01-01T00:00:00.000Z') as any,
      updatedDate: new Date('2026-01-02T00:00:00.000Z') as any,
      deadline: new Date('2026-01-03T00:00:00.000Z') as any,
      settings: {
        resultsVisibility: PollResultsVisibility.TOTAL_ONLY,
        resultsDetail: PollResultsDetail.FULL,
      } as any,
      options: [],
      votes: [],
    } as any,
  };

  it('applies visibility rules in pollVoteUpdated resolve when subscriber has not voted', async () => {
    const { resolver, pollService, pollVoteService } = createResolver();
    const resolve = getPollVoteUpdatedResolve();

    const freshPoll = { ...basePayload.poll, id: 'poll-1' } as any;
    const enrichedOptions = [
      { id: 'o1', voteCount: 10, votePercentage: 100, voterIds: ['u1'] },
    ] as any;
    const visibleOptions = [
      { id: 'o1', voteCount: null, votePercentage: null, voterIds: null },
    ] as any;

    pollService.getPollOrFail.mockResolvedValue(freshPoll);
    pollVoteService.getVoteForUser.mockResolvedValue(null);
    pollService.computePollResults.mockReturnValue(enrichedOptions);
    pollService.applyVisibilityRules.mockReturnValue(visibleOptions);

    const result = (await resolve.call(
      resolver,
      basePayload,
      { pollID: 'poll-1' },
      { req: { user: { actorID: 'user-1' } } }
    )) as any;

    expect(pollService.getPollOrFail).toHaveBeenCalledWith('poll-1');
    expect(pollVoteService.getVoteForUser).toHaveBeenCalledWith(
      'poll-1',
      'user-1'
    );
    expect(pollService.computePollResults).toHaveBeenCalledWith(freshPoll);
    expect(pollService.applyVisibilityRules).toHaveBeenCalledWith(
      enrichedOptions,
      freshPoll,
      false
    );
    expect(result.poll.options).toEqual(visibleOptions);
  });

  it('applies visibility rules in pollVoteUpdated resolve when subscriber has voted', async () => {
    const { resolver, pollService, pollVoteService } = createResolver();
    const resolve = getPollVoteUpdatedResolve();

    const freshPoll = { ...basePayload.poll, id: 'poll-1' } as any;
    const enrichedOptions = [
      { id: 'o1', voteCount: 3, votePercentage: 75, voterIds: ['user-1'] },
    ] as any;
    const visibleOptions = enrichedOptions;

    pollService.getPollOrFail.mockResolvedValue(freshPoll);
    pollVoteService.getVoteForUser.mockResolvedValue({ id: 'vote-1' });
    pollService.computePollResults.mockReturnValue(enrichedOptions);
    pollService.applyVisibilityRules.mockReturnValue(visibleOptions);

    const result = (await resolve.call(
      resolver,
      basePayload,
      { pollID: 'poll-1' },
      { req: { user: { actorID: 'user-1' } } }
    )) as any;

    expect(pollService.applyVisibilityRules).toHaveBeenCalledWith(
      enrichedOptions,
      freshPoll,
      true
    );
    expect(result.poll.options).toEqual(visibleOptions);
  });
});
