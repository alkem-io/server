import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PollVoteService } from '@domain/collaboration/poll-vote/poll.vote.service';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter/contribution.reporter.service';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service/subscription.publish.service';
import { vi } from 'vitest';
import { PollMutationsResolver } from './poll.resolver.mutations';
import { PollService } from './poll.service';

describe('PollMutationsResolver - contribution reporting', () => {
  const authorizationService = {
    grantAccessOrFail: vi.fn(),
  } as unknown as AuthorizationService;

  const communityResolverService = {
    getCommunityFromCollaborationCalloutOrFail: vi.fn(),
    getSpaceForCommunityOrFail: vi.fn(),
  } as unknown as CommunityResolverService;

  const contributionReporterService = {
    pollVoteContribution: vi.fn(),
    pollResponseAddedContribution: vi.fn(),
  } as unknown as ContributionReporterService;

  const notificationSpaceAdapter = {
    spaceCollaborationPollVoteCastOnOwnPoll: vi.fn(),
    spaceCollaborationPollVoteCastOnPollIVotedOn: vi.fn(),
    spaceCollaborationPollModifiedOnPollIVotedOn: vi.fn(),
    spaceCollaborationPollVoteAffectedByOptionChange: vi.fn(),
  } as unknown as NotificationSpaceAdapter;

  const pollService = {
    getPollOrFail: vi.fn(),
    addOption: vi.fn(),
    getCalloutContextForPoll: vi.fn(),
  } as unknown as PollService;

  const pollVoteService = {
    castVoteOnPoll: vi.fn(),
  } as unknown as PollVoteService;

  const subscriptionPublishService = {
    publishPollVoteUpdated: vi.fn().mockResolvedValue(undefined),
    publishPollOptionsChanged: vi.fn().mockResolvedValue(undefined),
  } as unknown as SubscriptionPublishService;

  const resolver = new PollMutationsResolver(
    authorizationService,
    communityResolverService,
    contributionReporterService,
    notificationSpaceAdapter,
    pollService,
    pollVoteService,
    subscriptionPublishService
  );

  beforeEach(() => {
    vi.clearAllMocks();

    (pollService.getCalloutContextForPoll as any).mockResolvedValue({
      calloutID: 'callout-1',
      createdBy: 'creator-1',
    });
    (
      communityResolverService.getCommunityFromCollaborationCalloutOrFail as any
    ).mockResolvedValue({ id: 'community-1' });
    (
      communityResolverService.getSpaceForCommunityOrFail as any
    ).mockResolvedValue({
      id: 'space-1',
      levelZeroSpaceID: 'space-root-1',
    });

    (
      notificationSpaceAdapter.spaceCollaborationPollVoteCastOnOwnPoll as any
    ).mockResolvedValue(undefined);
    (
      notificationSpaceAdapter.spaceCollaborationPollVoteCastOnPollIVotedOn as any
    ).mockResolvedValue(undefined);
    (
      notificationSpaceAdapter.spaceCollaborationPollModifiedOnPollIVotedOn as any
    ).mockResolvedValue(undefined);
    (
      notificationSpaceAdapter.spaceCollaborationPollVoteAffectedByOptionChange as any
    ).mockResolvedValue(undefined);
  });

  it('reports POLL_VOTE_CONTRIBUTION after castPollVote', async () => {
    (pollService.getPollOrFail as any).mockResolvedValue({
      id: 'poll-1',
      title: 'Sprint poll',
      authorization: {},
      votes: [],
    });
    (pollVoteService.castVoteOnPoll as any).mockResolvedValue({
      id: 'poll-1',
      title: 'Sprint poll',
      votes: [],
    });

    await resolver.castPollVote({ actorID: 'user-1' } as ActorContext, {
      pollID: 'poll-1',
      selectedOptionIDs: ['opt-1'],
    });

    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      AuthorizationPrivilege.CONTRIBUTE,
      'cast vote on poll: poll-1'
    );

    await vi.waitFor(() => {
      expect(
        contributionReporterService.pollVoteContribution
      ).toHaveBeenCalledWith(
        {
          id: 'poll-1',
          name: 'Sprint poll',
          space: 'space-root-1',
        },
        { actorID: 'user-1' }
      );
    });
  });

  it('reports POLL_RESPONSE_ADDED_CONTRIBUTION after addPollOption', async () => {
    (pollService.getPollOrFail as any).mockResolvedValue({
      id: 'poll-2',
      title: 'Roadmap poll',
      authorization: {},
      votes: [],
    });
    (pollService.addOption as any).mockResolvedValue({
      id: 'poll-2',
      title: 'Roadmap poll',
      votes: [],
    });

    await resolver.addPollOption({ actorID: 'user-2' } as ActorContext, {
      pollID: 'poll-2',
      text: 'Custom response',
    });

    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      AuthorizationPrivilege.UPDATE,
      'add option to poll: poll-2'
    );

    await vi.waitFor(() => {
      expect(
        contributionReporterService.pollResponseAddedContribution
      ).toHaveBeenCalledWith(
        {
          id: 'poll-2',
          name: 'Roadmap poll',
          space: 'space-root-1',
        },
        { actorID: 'user-2' }
      );
    });
  });
});
