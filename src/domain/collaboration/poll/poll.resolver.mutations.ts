import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { PollEventType } from '@common/enums/poll.event.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CastPollVoteInput } from '@domain/collaboration/poll-vote/dto/poll.vote.dto.cast';
import { PollVoteService } from '@domain/collaboration/poll-vote/poll.vote.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter/contribution.reporter.service';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service/subscription.publish.service';
import {
  AddPollOptionInput,
  RemovePollOptionInput,
  ReorderPollOptionsInput,
  UpdatePollOptionInput,
} from './dto/poll.dto.option';
import { PollSubscriptionPayload } from './dto/poll.subscription.payload';
import { IPoll } from './poll.interface';
import { PollService } from './poll.service';

@Resolver()
export class PollMutationsResolver {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly communityResolverService: CommunityResolverService,
    private readonly contributionReporterService: ContributionReporterService,
    private readonly notificationSpaceAdapter: NotificationSpaceAdapter,
    private readonly pollService: PollService,
    private readonly pollVoteService: PollVoteService,
    private readonly subscriptionPublishService: SubscriptionPublishService
  ) {}

  @Mutation(() => IPoll, {
    description:
      'Cast or update a vote on a Poll. Requires CONTRIBUTE privilege on the Poll (space member). If the calling user has already voted, their vote is REPLACED ENTIRELY with the new selection set.',
  })
  async castPollVote(
    @CurrentActor() actorContext: ActorContext,
    @Args('voteData') voteData: CastPollVoteInput
  ): Promise<IPoll> {
    const poll = await this.pollService.getPollOrFail(voteData.pollID);

    this.authorizationService.grantAccessOrFail(
      actorContext,
      poll.authorization,
      AuthorizationPrivilege.CONTRIBUTE,
      `cast vote on poll: ${poll.id}`
    );

    // Capture prior voter IDs before mutating
    const priorVoterIds = (poll.votes ?? []).map(v => v.createdBy);

    const updatedPoll = await this.pollVoteService.castVoteOnPoll(
      poll,
      actorContext.actorID,
      voteData.selectedOptionIDs
    );

    // Dispatch notifications fire-and-forget
    void this.dispatchVoteNotifications(
      poll.id,
      actorContext.actorID,
      priorVoterIds
    );

    // Publish subscription event
    void this.publishPollEvent(PollEventType.POLL_VOTE_UPDATED, updatedPoll);

    // Report contribution event (fire-and-forget)
    void this.reportPollVoteContribution(
      updatedPoll,
      actorContext.actorID
    ).catch(() => {
      /* fire-and-forget */
    });

    return updatedPoll;
  }

  @Mutation(() => IPoll, {
    description:
      'Add a new option to a Poll. Requires UPDATE privilege on the Poll. The new option is appended with the next available sort order.',
  })
  async addPollOption(
    @CurrentActor() actorContext: ActorContext,
    @Args('optionData') optionData: AddPollOptionInput
  ): Promise<IPoll> {
    const poll = await this.pollService.getPollOrFail(optionData.pollID);

    this.authorizationService.grantAccessOrFail(
      actorContext,
      poll.authorization,
      AuthorizationPrivilege.UPDATE,
      `add option to poll: ${poll.id}`
    );

    // Capture current voters before mutation
    const voterIds = (poll.votes ?? []).map(v => v.createdBy);

    const updatedPoll = await this.pollService.addOption(
      optionData.pollID,
      optionData.text
    );

    // Notify all prior voters that the poll was modified
    this.dispatchModifiedNotifications(
      poll.id,
      actorContext.actorID,
      voterIds
    ).catch(() => {
      /* errors logged inside */
    });

    // Publish subscription event
    void this.publishPollEvent(PollEventType.POLL_OPTIONS_CHANGED, updatedPoll);

    // Report contribution event (fire-and-forget)
    void this.reportPollResponseAddedContribution(
      updatedPoll,
      actorContext.actorID
    ).catch(() => {
      /* fire-and-forget */
    });

    return updatedPoll;
  }

  @Mutation(() => IPoll, {
    description:
      'Update the text of an existing Poll option. Requires UPDATE privilege. Votes that selected this option are deleted and affected voters are notified.',
  })
  async updatePollOption(
    @CurrentActor() actorContext: ActorContext,
    @Args('optionData') optionData: UpdatePollOptionInput
  ): Promise<IPoll> {
    const poll = await this.pollService.getPollOrFail(optionData.pollID);

    this.authorizationService.grantAccessOrFail(
      actorContext,
      poll.authorization,
      AuthorizationPrivilege.UPDATE,
      `update option on poll: ${poll.id}`
    );

    // Capture all voter IDs before mutation
    const allVoterIds = (poll.votes ?? []).map(v => v.createdBy);

    const { poll: updatedPoll, deletedVoterIds } =
      await this.pollService.updateOption(
        optionData.pollID,
        optionData.optionID,
        optionData.text
      );

    const deletedVoterSet = new Set(deletedVoterIds);
    const remainingVoterIds = allVoterIds.filter(
      id => !deletedVoterSet.has(id)
    );

    // Notify voters whose vote was deleted
    this.dispatchOptionChangeNotifications(
      poll.id,
      actorContext.actorID,
      deletedVoterIds,
      remainingVoterIds
    ).catch(() => {
      /* errors logged inside */
    });

    // Publish subscription event
    void this.publishPollEvent(PollEventType.POLL_OPTIONS_CHANGED, updatedPoll);

    return updatedPoll;
  }

  @Mutation(() => IPoll, {
    description:
      'Remove an option from a Poll. Requires UPDATE privilege. Poll must retain at least 2 options. Votes that selected this option are deleted and affected voters are notified.',
  })
  async removePollOption(
    @CurrentActor() actorContext: ActorContext,
    @Args('optionData') optionData: RemovePollOptionInput
  ): Promise<IPoll> {
    const poll = await this.pollService.getPollOrFail(optionData.pollID);

    this.authorizationService.grantAccessOrFail(
      actorContext,
      poll.authorization,
      AuthorizationPrivilege.UPDATE,
      `remove option from poll: ${poll.id}`
    );

    // Capture all voter IDs before mutation
    const allVoterIds = (poll.votes ?? []).map(v => v.createdBy);

    const { poll: updatedPoll, deletedVoterIds } =
      await this.pollService.removeOption(
        optionData.pollID,
        optionData.optionID
      );

    const deletedVoterSet = new Set(deletedVoterIds);
    const remainingVoterIds = allVoterIds.filter(
      id => !deletedVoterSet.has(id)
    );

    // Notify voters whose vote was deleted
    this.dispatchOptionChangeNotifications(
      poll.id,
      actorContext.actorID,
      deletedVoterIds,
      remainingVoterIds
    ).catch(() => {
      /* errors logged inside */
    });

    // Publish subscription event
    void this.publishPollEvent(PollEventType.POLL_OPTIONS_CHANGED, updatedPoll);

    return updatedPoll;
  }

  @Mutation(() => IPoll, {
    description:
      'Reorder Poll options. Requires UPDATE privilege. The provided list must contain exactly the same option IDs as the current poll options.',
  })
  async reorderPollOptions(
    @CurrentActor() actorContext: ActorContext,
    @Args('optionData') optionData: ReorderPollOptionsInput
  ): Promise<IPoll> {
    const poll = await this.pollService.getPollOrFail(optionData.pollID);

    this.authorizationService.grantAccessOrFail(
      actorContext,
      poll.authorization,
      AuthorizationPrivilege.UPDATE,
      `reorder options on poll: ${poll.id}`
    );

    // Capture current voters before mutation
    const voterIds = (poll.votes ?? []).map(v => v.createdBy);

    const updatedPoll = await this.pollService.reorderOptions(
      optionData.pollID,
      optionData.optionIDs
    );

    // Notify all prior voters that the poll was modified
    void this.dispatchModifiedNotifications(
      poll.id,
      actorContext.actorID,
      voterIds
    );

    // Publish subscription event
    void this.publishPollEvent(PollEventType.POLL_OPTIONS_CHANGED, updatedPoll);

    return updatedPoll;
  }

  private publishPollEvent(
    pollEventType: PollEventType,
    poll: IPoll
  ): Promise<void> {
    const payload: PollSubscriptionPayload = {
      eventID: `${pollEventType}-${Math.round(Math.random() * 1000)}`,
      pollEventType,
      poll,
    };

    if (pollEventType === PollEventType.POLL_VOTE_UPDATED) {
      return this.subscriptionPublishService.publishPollVoteUpdated(payload);
    }
    return this.subscriptionPublishService.publishPollOptionsChanged(payload);
  }

  /** Notify poll creator + prior voters when a new vote is cast (T061). */
  private async dispatchVoteNotifications(
    pollId: string,
    voterId: string,
    priorVoterIds: string[]
  ): Promise<void> {
    const { calloutID, createdBy: creatorId } =
      await this.pollService.getCalloutContextForPoll(pollId);
    const community =
      await this.communityResolverService.getCommunityFromCollaborationCalloutOrFail(
        calloutID
      );
    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        community.id
      );
    const spaceID = space.id;

    const baseDto = { triggeredBy: voterId, calloutID, pollID: pollId };

    // Notify poll creator if they are not the voter
    if (creatorId !== voterId) {
      await this.notificationSpaceAdapter.spaceCollaborationPollVoteCastOnOwnPoll(
        { ...baseDto, userID: creatorId },
        spaceID
      );
    }

    // Notify prior voters (excluding current voter and creator if already notified)
    const notifiedAlready = new Set([
      voterId,
      creatorId !== voterId ? creatorId : '',
    ]);
    const priorVotersToNotify = priorVoterIds.filter(
      id => !notifiedAlready.has(id)
    );

    for (const priorVoterId of priorVotersToNotify) {
      await this.notificationSpaceAdapter.spaceCollaborationPollVoteCastOnPollIVotedOn(
        { ...baseDto, userID: priorVoterId },
        spaceID
      );
    }
  }

  /** Notify all prior voters when the poll structure is modified (T062). */
  private async dispatchModifiedNotifications(
    pollId: string,
    actorId: string,
    voterIds: string[]
  ): Promise<void> {
    if (voterIds.length === 0) return;

    const { calloutID } =
      await this.pollService.getCalloutContextForPoll(pollId);
    const community =
      await this.communityResolverService.getCommunityFromCollaborationCalloutOrFail(
        calloutID
      );
    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        community.id
      );
    const spaceID = space.id;
    const baseDto = { triggeredBy: actorId, calloutID, pollID: pollId };

    for (const voterId of voterIds) {
      await this.notificationSpaceAdapter.spaceCollaborationPollModifiedOnPollIVotedOn(
        { ...baseDto, userID: voterId },
        spaceID
      );
    }
  }

  /**
   * Notify deleted voters (VOTE_AFFECTED_BY_OPTION_CHANGE) and remaining voters
   * (POLL_MODIFIED_ON_POLL_I_VOTED_ON) when a poll option changes (T063, T064).
   */
  private async dispatchOptionChangeNotifications(
    pollId: string,
    actorId: string,
    deletedVoterIds: string[],
    remainingVoterIds: string[]
  ): Promise<void> {
    const hasWork = deletedVoterIds.length > 0 || remainingVoterIds.length > 0;
    if (!hasWork) return;

    const { calloutID } =
      await this.pollService.getCalloutContextForPoll(pollId);
    const community =
      await this.communityResolverService.getCommunityFromCollaborationCalloutOrFail(
        calloutID
      );
    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        community.id
      );
    const spaceID = space.id;
    const baseDto = { triggeredBy: actorId, calloutID, pollID: pollId };

    for (const voterId of deletedVoterIds) {
      await this.notificationSpaceAdapter.spaceCollaborationPollVoteAffectedByOptionChange(
        { ...baseDto, userID: voterId },
        spaceID
      );
    }

    for (const voterId of remainingVoterIds) {
      await this.notificationSpaceAdapter.spaceCollaborationPollModifiedOnPollIVotedOn(
        { ...baseDto, userID: voterId },
        spaceID
      );
    }
  }

  private async reportPollVoteContribution(
    poll: IPoll,
    actorId: string
  ): Promise<void> {
    const { calloutID } = await this.pollService.getCalloutContextForPoll(
      poll.id
    );
    const community =
      await this.communityResolverService.getCommunityFromCollaborationCalloutOrFail(
        calloutID
      );
    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        community.id
      );

    this.contributionReporterService.pollVoteContribution(
      {
        id: poll.id,
        name: poll.title,
        space: space.levelZeroSpaceID,
      },
      { actorID: actorId }
    );
  }

  private async reportPollResponseAddedContribution(
    poll: IPoll,
    actorId: string
  ): Promise<void> {
    const { calloutID } = await this.pollService.getCalloutContextForPoll(
      poll.id
    );
    const community =
      await this.communityResolverService.getCommunityFromCollaborationCalloutOrFail(
        calloutID
      );
    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        community.id
      );

    this.contributionReporterService.pollResponseAddedContribution(
      {
        id: poll.id,
        name: poll.title,
        space: space.levelZeroSpaceID,
      },
      { actorID: actorId }
    );
  }
}
