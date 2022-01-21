import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AgentInfo } from '@core/authentication/agent-info';
import { GraphqlGuard } from '@core/authorization';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver, Subscription } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PubSubEngine } from 'graphql-subscriptions';
import { LogContext } from '@common/enums/logging.context';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CommunicationDiscussionMessageReceived } from './dto/discussion.dto.event.message.received';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { DiscussionService } from './discussion.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SUBSCRIPTION_DISCUSSION_MESSAGE } from '@common/constants/providers';

@Resolver()
export class DiscussionResolverSubscriptions {
  constructor(
    private authorizationService: AuthorizationService,
    private discussionService: DiscussionService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_DISCUSSION_MESSAGE)
    private subscriptionDiscussionMessage: PubSubEngine
  ) {}

  // Note: the resolving method should not be doing any heavy lifting.
  // Relies on users being cached for performance.
  @UseGuards(GraphqlGuard)
  @Subscription(() => CommunicationDiscussionMessageReceived, {
    description: 'Receive new Discussion messages',
    async resolve(
      this: DiscussionResolverSubscriptions,
      payload: CommunicationDiscussionMessageReceived,
      _: any,
      context: any
    ): Promise<CommunicationDiscussionMessageReceived> {
      const agentInfo = context.req?.user;
      const logMsgPrefix = `[User (${agentInfo.email}) DiscussionMsg] - `;
      this.logger.verbose?.(
        `${logMsgPrefix} Sending out event: ${payload.discussionID} `,
        LogContext.SUBSCRIPTIONS
      );
      return payload;
    },
    async filter(
      this: DiscussionResolverSubscriptions,
      payload: CommunicationDiscussionMessageReceived,
      variables: any,
      context: any
    ) {
      const agentInfo = context.req?.user;
      const discussionIDs: string[] = variables.discussionIDs;
      const logMsgPrefix = `[User (${agentInfo.email}) DiscussionMsg] - `;
      this.logger.verbose?.(
        `${logMsgPrefix} Filtering event id '${payload.eventID}'`,
        LogContext.SUBSCRIPTIONS
      );
      if (!discussionIDs) {
        // If subscribed to all then need to check on every update the authorization to see it as could not be done
        // on the subscription approval
        this.logger.verbose?.(
          `${logMsgPrefix} Subscribed to all msgs; filtering by Authorization to see ${payload.discussionID}`,
          LogContext.SUBSCRIPTIONS
        );
        const updates = await this.discussionService.getDiscussionOrFail(
          payload.discussionID
        );
        const filter = await this.authorizationService.isAccessGranted(
          agentInfo,
          updates.authorization,
          AuthorizationPrivilege.READ
        );
        this.logger.verbose?.(
          `${logMsgPrefix} ...filter result: ${filter}`,
          LogContext.SUBSCRIPTIONS
        );
        return filter;
      } else {
        // No need to do an authorization check as was done on the subscription approval
        const inList = discussionIDs.includes(payload.discussionID);
        this.logger.verbose?.(
          `${logMsgPrefix} - Filter result is ${inList}`,
          LogContext.SUBSCRIPTIONS
        );
        return inList;
      }
    },
  })
  async communicationDiscussionMessageReceived(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'discussionIDs',
      type: () => [UUID],
      description:
        'The IDs of the Discussion to subscribe to; if omitted subscribe to all Discussions.',
      nullable: true,
    })
    discussionIDs: string[]
  ) {
    const logMsgPrefix = `[User (${agentInfo.email}) DiscussionMsg] - `;
    if (discussionIDs) {
      this.logger.verbose?.(
        `${logMsgPrefix} Subscribing to the following discussions: ${discussionIDs}`,
        LogContext.SUBSCRIPTIONS
      );
      for (const discussionID of discussionIDs) {
        // check the user has the READ privilege
        const updates = await this.discussionService.getDiscussionOrFail(
          discussionID
        );
        await this.authorizationService.grantAccessOrFail(
          agentInfo,
          updates.authorization,
          AuthorizationPrivilege.READ,
          `subscription to discussion on: ${updates.displayName}`
        );
      }
    } else {
      this.logger.verbose?.(
        `${logMsgPrefix} Subscribing to all discussions`,
        LogContext.SUBSCRIPTIONS
      );

      // Todo: either disable this option or find a way to do this once in this method and pass the resulting
      // array of discussionIDs to the filter call
    }

    return this.subscriptionDiscussionMessage.asyncIterator(
      SubscriptionType.COMMUNICATION_DISCUSSION_MESSAGE_RECEIVED
    );
  }
}
