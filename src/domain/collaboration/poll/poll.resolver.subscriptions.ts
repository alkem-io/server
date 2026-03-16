import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { SubscriptionResolveContext } from '@common/decorators/typed.subscription/subscription.resolve.context';
import { TypedSubscription } from '@common/decorators/typed.subscription/typed.subscription.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { PollResultsVisibility } from '@common/enums/poll.results.visibility';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PollVoteService } from '@domain/collaboration/poll-vote/poll.vote.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Resolver } from '@nestjs/graphql';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service/subscription.read.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PollOptionsChangedSubscriptionResult } from './dto/poll.options.changed.subscription.result';
import { PollSubscriptionArgs } from './dto/poll.subscription.args';
import { PollSubscriptionPayload } from './dto/poll.subscription.payload';
import { PollVoteUpdatedSubscriptionResult } from './dto/poll.vote.updated.subscription.result';
import { Poll } from './poll.entity';
import { PollService } from './poll.service';

@InstrumentResolver()
@Resolver()
export class PollResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly subscriptionService: SubscriptionReadService,
    private readonly pollService: PollService,
    private readonly pollVoteService: PollVoteService,
    private readonly authorizationService: AuthorizationService
  ) {}

  @TypedSubscription<
    PollSubscriptionPayload,
    PollSubscriptionArgs,
    SubscriptionResolveContext
  >(() => PollVoteUpdatedSubscriptionResult, {
    description:
      'Subscribe to vote updates on a specific Poll. Fires when votes are cast or updated. When resultsVisibility = HIDDEN and the subscriber has not voted, events are suppressed.',
    async resolve(
      this: PollResolverSubscriptions,
      payload,
      _args,
      context
    ): Promise<PollVoteUpdatedSubscriptionResult> {
      const actorID = context.req.user?.actorID ?? '';
      const vote = actorID
        ? await this.pollVoteService.getVoteForUser(payload.poll.id, actorID)
        : null;
      const hasVoted = vote !== null;

      const poll = payload.poll as Poll;
      const enrichedOptions = this.pollService.computePollResults(poll);
      const visibleOptions = this.pollService.applyVisibilityRules(
        enrichedOptions,
        poll,
        hasVoted
      );

      // Rehydrate dates: PubSub JSON serialization converts Date → ISO string,
      // but the DateTime scalar's serialize() requires instanceof Date.
      return {
        pollEventType: payload.pollEventType,
        poll: {
          ...payload.poll,
          options: visibleOptions,
          createdDate: new Date(payload.poll.createdDate),
          updatedDate: new Date(payload.poll.updatedDate),
          ...(payload.poll.deadline
            ? { deadline: new Date(payload.poll.deadline) }
            : {}),
        },
      };
    },
    async filter(
      this: PollResolverSubscriptions,
      payload,
      variables,
      context
    ): Promise<boolean> {
      const isMatch = variables.pollID === payload.poll.id;
      if (!isMatch) return false;

      // Suppress vote events when resultsVisibility = HIDDEN and subscriber has not voted (FR-030)
      // Settings are immutable (FR-025), so we can safely use the payload's copy.
      const actorID = context.req.user.actorID;
      if (
        payload.poll.settings.resultsVisibility === PollResultsVisibility.HIDDEN
      ) {
        const vote = await this.pollVoteService.getVoteForUser(
          payload.poll.id,
          actorID
        );
        if (!vote) {
          this.logger.debug?.(
            `[PollVoteUpdated] Suppressing event '${payload.eventID}' for user ${actorID}: resultsVisibility=HIDDEN and user has not voted`,
            LogContext.SUBSCRIPTIONS
          );
          return false;
        }
      }

      this.logger.debug?.(
        `[PollVoteUpdated] Delivering event '${payload.eventID}' to user ${actorID} for poll ${payload.poll.id}`,
        LogContext.SUBSCRIPTIONS
      );
      return true;
    },
  })
  async pollVoteUpdated(
    @CurrentActor() actorContext: ActorContext,
    @Args({ nullable: false })
    { pollID }: PollSubscriptionArgs
  ) {
    this.logger.debug?.(
      `[User ${actorContext.actorID}] Subscribing to poll vote updates: ${pollID}`,
      LogContext.SUBSCRIPTIONS
    );

    const poll = await this.pollService.getPollOrFail(pollID);

    this.authorizationService.grantAccessOrFail(
      actorContext,
      poll.authorization,
      AuthorizationPrivilege.READ,
      `subscription to poll vote updates: ${poll.id}`
    );

    return this.subscriptionService.subscribeToPollVoteUpdated();
  }

  @TypedSubscription<
    PollSubscriptionPayload,
    PollSubscriptionArgs,
    SubscriptionResolveContext
  >(() => PollOptionsChangedSubscriptionResult, {
    description:
      'Subscribe to option changes on a specific Poll. Fires when options are added, removed, updated, or reordered. Always delivered regardless of resultsVisibility.',
    resolve(
      this: PollResolverSubscriptions,
      payload
    ): PollOptionsChangedSubscriptionResult {
      // Rehydrate dates: PubSub JSON serialization converts Date → ISO string,
      // but the DateTime scalar's serialize() requires instanceof Date.
      return {
        pollEventType: payload.pollEventType,
        poll: {
          ...payload.poll,
          createdDate: new Date(payload.poll.createdDate),
          updatedDate: new Date(payload.poll.updatedDate),
          ...(payload.poll.deadline
            ? { deadline: new Date(payload.poll.deadline) }
            : {}),
        },
      };
    },
    async filter(
      this: PollResolverSubscriptions,
      payload,
      variables,
      context
    ): Promise<boolean> {
      const isMatch = variables.pollID === payload.poll.id;
      if (!isMatch) return false;

      const actorID = context.req.user.actorID;
      this.logger.debug?.(
        `[PollOptionsChanged] Delivering event '${payload.eventID}' to user ${actorID} for poll ${payload.poll.id}`,
        LogContext.SUBSCRIPTIONS
      );
      return true;
    },
  })
  async pollOptionsChanged(
    @CurrentActor() actorContext: ActorContext,
    @Args({ nullable: false })
    { pollID }: PollSubscriptionArgs
  ) {
    this.logger.debug?.(
      `[User ${actorContext.actorID}] Subscribing to poll options changes: ${pollID}`,
      LogContext.SUBSCRIPTIONS
    );

    const poll = await this.pollService.getPollOrFail(pollID);

    this.authorizationService.grantAccessOrFail(
      actorContext,
      poll.authorization,
      AuthorizationPrivilege.READ,
      `subscription to poll options changes: ${poll.id}`
    );

    return this.subscriptionService.subscribeToPollOptionsChanged();
  }
}
