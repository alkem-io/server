import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { PollMutationsResolver } from './poll.resolver.mutations';

const flushFireAndForget = () => new Promise(resolve => setImmediate(resolve));

describe('PollMutationsResolver — side effects on template polls', () => {
  const authorizationService = { grantAccessOrFail: vi.fn() };
  const communityResolverService = {
    getCommunityFromCollaborationCalloutOrFail: vi.fn(),
    getSpaceForCommunityOrFail: vi.fn(),
  };
  const contributionReporterService = {
    pollVoteContribution: vi.fn(),
    pollResponseAddedContribution: vi.fn(),
  };
  const notificationSpaceAdapter = {
    spaceCollaborationPollVoteCastOnOwnPoll: vi.fn(),
    spaceCollaborationPollVoteCastOnPollIVotedOn: vi.fn(),
    spaceCollaborationPollModifiedOnPollIVotedOn: vi.fn(),
    spaceCollaborationPollVoteAffectedByOptionChange: vi.fn(),
  };
  const pollService = {
    getPollOrFail: vi.fn(),
    getCalloutContextForPoll: vi.fn(),
    addOption: vi.fn(),
    updateOption: vi.fn(),
    removeOption: vi.fn(),
    reorderOptions: vi.fn(),
  };
  const pollVoteService = { castVoteOnPoll: vi.fn() };
  const subscriptionPublishService = {
    publishPollVoteUpdated: vi.fn(),
    publishPollOptionsChanged: vi.fn(),
  };
  const logger = { error: vi.fn() };
  let resolver: PollMutationsResolver;

  const actor = { actorID: 'admin-1' } as any;
  const poll = {
    id: 'poll-1',
    title: 'Lunch?',
    authorization: { id: 'poll-auth' },
    settings: { allowContributorsAddOptions: false },
    votes: [],
  } as any;

  beforeEach(() => {
    vi.resetAllMocks();
    pollService.getPollOrFail.mockResolvedValue(poll);
    pollService.addOption.mockResolvedValue(poll);
    pollService.updateOption.mockResolvedValue({
      poll,
      deletedVoterIds: [],
    });
    pollService.removeOption.mockResolvedValue({
      poll,
      deletedVoterIds: [],
    });
    pollService.reorderOptions.mockResolvedValue(poll);
    pollVoteService.castVoteOnPoll.mockResolvedValue(poll);
    resolver = new PollMutationsResolver(
      authorizationService as any,
      communityResolverService as any,
      contributionReporterService as any,
      notificationSpaceAdapter as any,
      pollService as any,
      pollVoteService as any,
      subscriptionPublishService as any,
      logger as any
    );
  });

  describe('on a template poll', () => {
    beforeEach(() => {
      // A callout template has no creator; the poll has no space.
      pollService.getCalloutContextForPoll.mockResolvedValue({
        calloutID: 'template-callout',
        createdBy: null,
        isTemplate: true,
      });
      communityResolverService.getCommunityFromCollaborationCalloutOrFail.mockRejectedValue(
        new Error('no community for a template callout')
      );
    });

    it('adds an option under UPDATE without resolving a space, notifying or reporting', async () => {
      await resolver.addPollOption(actor, {
        pollID: 'poll-1',
        text: 'Soup',
      } as any);
      await flushFireAndForget();

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actor,
        poll.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(pollService.addOption).toHaveBeenCalledWith('poll-1', 'Soup');
      expect(
        communityResolverService.getCommunityFromCollaborationCalloutOrFail
      ).not.toHaveBeenCalled();
      expect(
        contributionReporterService.pollResponseAddedContribution
      ).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('updates, removes and reorders options under UPDATE without logging errors', async () => {
      await resolver.updatePollOption(actor, {
        pollID: 'poll-1',
        optionID: 'o-1',
        text: 'Salad',
      } as any);
      await resolver.removePollOption(actor, {
        pollID: 'poll-1',
        optionID: 'o-2',
      } as any);
      await resolver.reorderPollOptions(actor, {
        pollID: 'poll-1',
        optionIDs: ['o-3', 'o-1'],
      } as any);
      await flushFireAndForget();

      expect(pollService.updateOption).toHaveBeenCalled();
      expect(pollService.removeOption).toHaveBeenCalled();
      expect(pollService.reorderOptions).toHaveBeenCalled();
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledTimes(3);
      for (const call of authorizationService.grantAccessOrFail.mock.calls) {
        expect(call[2]).toBe(AuthorizationPrivilege.UPDATE);
      }
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('does not dispatch vote notifications or a vote report', async () => {
      await resolver.castPollVote(actor, {
        pollID: 'poll-1',
        selectedOptionIDs: ['o-1'],
      } as any);
      await flushFireAndForget();

      expect(
        notificationSpaceAdapter.spaceCollaborationPollVoteCastOnOwnPoll
      ).not.toHaveBeenCalled();
      expect(
        contributionReporterService.pollVoteContribution
      ).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('on a poll in a space (positive control)', () => {
    beforeEach(() => {
      pollService.getCalloutContextForPoll.mockResolvedValue({
        calloutID: 'callout-1',
        createdBy: 'creator-1',
        isTemplate: false,
      });
      communityResolverService.getCommunityFromCollaborationCalloutOrFail.mockResolvedValue(
        { id: 'community-1' }
      );
      communityResolverService.getSpaceForCommunityOrFail.mockResolvedValue({
        id: 'space-1',
        levelZeroSpaceID: 'l0',
      });
    });

    it('still reports the added option against the level-zero space', async () => {
      await resolver.addPollOption(actor, {
        pollID: 'poll-1',
        text: 'Soup',
      } as any);
      await flushFireAndForget();

      expect(
        contributionReporterService.pollResponseAddedContribution
      ).toHaveBeenCalledWith(
        { id: 'poll-1', name: 'Lunch?', space: 'l0' },
        { actorID: 'admin-1' }
      );
      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
