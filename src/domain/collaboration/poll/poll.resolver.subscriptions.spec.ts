import { PollEventType } from '@common/enums/poll.event.type';
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
        allowContributorsAddOptions: false,
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

  // ─── POLL_STATUS_CHANGED subscription tests ───────────────────────────

  const getPollVoteUpdatedFilter = () => {
    const metadata = Reflect.getMetadata(
      SUBSCRIPTION_OPTIONS_METADATA,
      PollResolverSubscriptions.prototype.pollVoteUpdated
    ) as {
      filter: (
        payload: PollSubscriptionPayload,
        variables: { pollID: string },
        context: { req: { user?: { actorID?: string } } }
      ) => Promise<boolean>;
    };

    return metadata.filter;
  };

  it('POLL_STATUS_CHANGED: resolve returns correct pollEventType', async () => {
    const { resolver, pollService, pollVoteService } = createResolver();
    const resolve = getPollVoteUpdatedResolve();

    const statusPayload: PollSubscriptionPayload = {
      ...basePayload,
      pollEventType: PollEventType.POLL_STATUS_CHANGED,
    };

    const freshPoll = { ...basePayload.poll, id: 'poll-1' } as any;
    const enrichedOptions = [] as any;
    const visibleOptions = [] as any;

    pollService.getPollOrFail.mockResolvedValue(freshPoll);
    pollVoteService.getVoteForUser.mockResolvedValue(null);
    pollService.computePollResults.mockReturnValue(enrichedOptions);
    pollService.applyVisibilityRules.mockReturnValue(visibleOptions);

    const result = (await resolve.call(
      resolver,
      statusPayload,
      { pollID: 'poll-1' },
      { req: { user: { actorID: 'user-1' } } }
    )) as any;

    expect(result.pollEventType).toBe(PollEventType.POLL_STATUS_CHANGED);
  });

  it('POLL_STATUS_CHANGED: filter returns true when pollID matches and visibility is VISIBLE', async () => {
    const { resolver } = createResolver();
    const filter = getPollVoteUpdatedFilter();

    const statusPayload: PollSubscriptionPayload = {
      eventID: 'evt-status-1',
      pollEventType: PollEventType.POLL_STATUS_CHANGED,
      poll: {
        id: 'poll-1',
        settings: {
          resultsVisibility: PollResultsVisibility.VISIBLE,
          resultsDetail: PollResultsDetail.FULL,
          allowContributorsAddOptions: false,
        },
      } as any,
    };

    const result = await filter.call(
      resolver,
      statusPayload,
      { pollID: 'poll-1' },
      { req: { user: { actorID: 'user-1' } } }
    );

    expect(result).toBe(true);
  });

  it('POLL_STATUS_CHANGED: filter returns false when pollID does not match', async () => {
    const { resolver } = createResolver();
    const filter = getPollVoteUpdatedFilter();

    const statusPayload: PollSubscriptionPayload = {
      eventID: 'evt-status-2',
      pollEventType: PollEventType.POLL_STATUS_CHANGED,
      poll: {
        id: 'poll-1',
        settings: {
          resultsVisibility: PollResultsVisibility.VISIBLE,
          resultsDetail: PollResultsDetail.FULL,
          allowContributorsAddOptions: false,
        },
      } as any,
    };

    const result = await filter.call(
      resolver,
      statusPayload,
      { pollID: 'different-poll' },
      { req: { user: { actorID: 'user-1' } } }
    );

    expect(result).toBe(false);
  });

  it('POLL_STATUS_CHANGED: filter suppresses event when HIDDEN and subscriber has not voted', async () => {
    const { resolver, pollVoteService } = createResolver();
    const filter = getPollVoteUpdatedFilter();

    const statusPayload: PollSubscriptionPayload = {
      eventID: 'evt-status-3',
      pollEventType: PollEventType.POLL_STATUS_CHANGED,
      poll: {
        id: 'poll-1',
        settings: {
          resultsVisibility: PollResultsVisibility.HIDDEN,
          resultsDetail: PollResultsDetail.FULL,
          allowContributorsAddOptions: false,
        },
      } as any,
    };

    pollVoteService.getVoteForUser.mockResolvedValue(null);

    const result = await filter.call(
      resolver,
      statusPayload,
      { pollID: 'poll-1' },
      { req: { user: { actorID: 'user-1' } } }
    );

    expect(result).toBe(false);
  });

  it('POLL_STATUS_CHANGED: filter delivers event when HIDDEN and subscriber has voted', async () => {
    const { resolver, pollVoteService } = createResolver();
    const filter = getPollVoteUpdatedFilter();

    const statusPayload: PollSubscriptionPayload = {
      eventID: 'evt-status-4',
      pollEventType: PollEventType.POLL_STATUS_CHANGED,
      poll: {
        id: 'poll-1',
        settings: {
          resultsVisibility: PollResultsVisibility.HIDDEN,
          resultsDetail: PollResultsDetail.FULL,
          allowContributorsAddOptions: false,
        },
      } as any,
    };

    pollVoteService.getVoteForUser.mockResolvedValue({ id: 'vote-1' });

    const result = await filter.call(
      resolver,
      statusPayload,
      { pollID: 'poll-1' },
      { req: { user: { actorID: 'user-1' } } }
    );

    expect(result).toBe(true);
  });
});
