import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { PollEventType } from '@common/enums/poll.event.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CastPollVoteInput } from '@domain/collaboration/poll-vote/dto/poll.vote.dto.cast';
import { RemovePollVoteInput } from '@domain/collaboration/poll-vote/dto/poll.vote.dto.remove';
import { PollVoteService } from '@domain/collaboration/poll-vote/poll.vote.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service/subscription.publish.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { randomUUID } from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  AddPollOptionInput,
  RemovePollOptionInput,
  ReorderPollOptionsInput,
  UpdatePollOptionInput,
} from './dto/poll.dto.option';
import { UpdatePollStatusInput } from './dto/poll.dto.update.status';
import { PollSubscriptionPayload } from './dto/poll.subscription.payload';
import { IPoll } from './poll.interface';
import { PollService } from './poll.service';

@InstrumentResolver()
@Resolver()
export class PollMutationsResolver {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly communityResolverService: CommunityResolverService,
    private readonly notificationSpaceAdapter: NotificationSpaceAdapter,
    private readonly pollService: PollService,
    private readonly pollVoteService: PollVoteService,
    private readonly subscriptionPublishService: SubscriptionPublishService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
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
      'cast vote on poll'
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

    return updatedPoll;
  }

  @Mutation(() => IPoll, {
    description:
      'Remove the current user vote from a Poll. Requires CONTRIBUTE privilege on the Poll. If the user has not voted, returns a validation error.',
  })
  async removePollVote(
    @CurrentActor() actorContext: ActorContext,
    @Args('voteData') voteData: RemovePollVoteInput
  ): Promise<IPoll> {
    const poll = await this.pollService.getPollOrFail(voteData.pollID);

    this.authorizationService.grantAccessOrFail(
      actorContext,
      poll.authorization,
      AuthorizationPrivilege.CONTRIBUTE,
      'remove vote from poll'
    );

    const updatedPoll = await this.pollVoteService.removeVote(
      voteData.pollID,
      actorContext.actorID
    );

    // Vote removal is silent for notifications, but subscription updates are published.
    void this.publishPollEvent(PollEventType.POLL_VOTE_UPDATED, updatedPoll);

    return updatedPoll;
  }

  @Mutation(() => IPoll, {
    description:
      'Add a new option to a Poll. Requires UPDATE privilege, or CONTRIBUTE privilege when the poll setting allowContributorsAddOptions is enabled. The new option is appended with the next available sort order.',
  })
  async addPollOption(
    @CurrentActor() actorContext: ActorContext,
    @Args('optionData') optionData: AddPollOptionInput
  ): Promise<IPoll> {
    const poll = await this.pollService.getPollOrFail(optionData.pollID);

    if (poll.settings.allowContributorsAddOptions) {
      // If allowContributorsAddOptions is enabled, users with CONTRIBUTE privilege can add options.
      // This is a relaxed permission check that does not require UPDATE privilege, but it still ensures the user has at least CONTRIBUTE access to the poll.
      this.authorizationService.grantAccessOrFail(
        actorContext,
        poll.authorization,
        AuthorizationPrivilege.CONTRIBUTE,
        'add option to poll'
      );
    } else {
      // Normal voters cannot add options, so we enforce the UPDATE privilege
      this.authorizationService.grantAccessOrFail(
        actorContext,
        poll.authorization,
        AuthorizationPrivilege.UPDATE,
        'add option to poll'
      );
    }

    // Capture current voters before mutation
    const voterIds = (poll.votes ?? []).map(v => v.createdBy);

    const updatedPoll = await this.pollService.addOption(
      optionData.pollID,
      optionData.text
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
      'update option on poll'
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
    void this.dispatchOptionChangeNotifications(
      poll.id,
      actorContext.actorID,
      deletedVoterIds,
      remainingVoterIds
    );

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
      'remove option from poll'
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
    void this.dispatchOptionChangeNotifications(
      poll.id,
      actorContext.actorID,
      deletedVoterIds,
      remainingVoterIds
    );

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
      'reorder options on poll'
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

  @Mutation(() => IPoll, {
    description:
      'Change the status of a Poll (OPEN ↔ CLOSED). Requires UPDATE privilege on the parent Callout. When a poll is CLOSED, all state-mutating operations are rejected. Idempotent: setting to current status succeeds without error.',
  })
  async updatePollStatus(
    @CurrentActor() actorContext: ActorContext,
    @Args('statusData') statusData: UpdatePollStatusInput
  ): Promise<IPoll> {
    const poll = await this.pollService.getPollOrFail(statusData.pollID);

    this.authorizationService.grantAccessOrFail(
      actorContext,
      poll.authorization,
      AuthorizationPrivilege.UPDATE,
      'update poll status'
    );

    const updatedPoll = await this.pollService.updateStatus(
      statusData.pollID,
      statusData.status
    );

    // Publish subscription event so real-time clients see the status change
    void this.publishPollEvent(PollEventType.POLL_STATUS_CHANGED, updatedPoll);

    return updatedPoll;
  }

  private async publishPollEvent(
    pollEventType: PollEventType,
    poll: IPoll
  ): Promise<void> {
    try {
      const payload: PollSubscriptionPayload = {
        eventID: `${pollEventType}-${randomUUID()}`,
        pollEventType,
        poll,
      };

      if (
        pollEventType === PollEventType.POLL_VOTE_UPDATED ||
        pollEventType === PollEventType.POLL_STATUS_CHANGED
      ) {
        await this.subscriptionPublishService.publishPollVoteUpdated(payload);
      } else {
        await this.subscriptionPublishService.publishPollOptionsChanged(
          payload
        );
      }
    } catch (error) {
      this.logger.error?.(
        {
          message: 'Failed to publish poll subscription event',
          pollEventType,
          error: (error as Error)?.message,
        },
        (error as Error)?.stack ?? '',
        LogContext.SUBSCRIPTIONS
      );
    }
  }

  /** Notify poll creator + prior voters when a new vote is cast (T061). */
  private async dispatchVoteNotifications(
    pollId: string,
    voterId: string,
    priorVoterIds: string[]
  ): Promise<void> {
    try {
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
      const notifiedAlready = new Set([voterId, creatorId]);
      const priorVotersToNotify = priorVoterIds.filter(
        id => !notifiedAlready.has(id)
      );

      await Promise.allSettled(
        priorVotersToNotify.map(priorVoterId =>
          this.notificationSpaceAdapter.spaceCollaborationPollVoteCastOnPollIVotedOn(
            { ...baseDto, userID: priorVoterId },
            spaceID
          )
        )
      );
    } catch (error) {
      this.logger.error?.(
        {
          message: 'Failed to dispatch vote notifications for poll',
          error: (error as Error)?.message,
        },
        (error as Error)?.stack ?? '',
        LogContext.COLLABORATION
      );
    }
  }

  /** Notify all prior voters when the poll structure is modified (T062). */
  private async dispatchModifiedNotifications(
    pollId: string,
    actorId: string,
    voterIds: string[]
  ): Promise<void> {
    try {
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

      await Promise.allSettled(
        voterIds.map(voterId =>
          this.notificationSpaceAdapter.spaceCollaborationPollModifiedOnPollIVotedOn(
            { ...baseDto, userID: voterId },
            spaceID
          )
        )
      );
    } catch (error) {
      this.logger.error?.(
        {
          message: 'Failed to dispatch modified notifications for poll',
          error: (error as Error)?.message,
        },
        (error as Error)?.stack ?? '',
        LogContext.COLLABORATION
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
    try {
      const hasWork =
        deletedVoterIds.length > 0 || remainingVoterIds.length > 0;
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

      await Promise.allSettled([
        ...deletedVoterIds.map(voterId =>
          this.notificationSpaceAdapter.spaceCollaborationPollVoteAffectedByOptionChange(
            { ...baseDto, userID: voterId },
            spaceID
          )
        ),
        ...remainingVoterIds.map(voterId =>
          this.notificationSpaceAdapter.spaceCollaborationPollModifiedOnPollIVotedOn(
            { ...baseDto, userID: voterId },
            spaceID
          )
        ),
      ]);
    } catch (error) {
      this.logger.error?.(
        {
          message: 'Failed to dispatch option change notifications for poll',
          error: (error as Error)?.message,
        },
        (error as Error)?.stack ?? '',
        LogContext.COLLABORATION
      );
    }
  }
}
