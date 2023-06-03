import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AgentInfo } from '@core/authentication/agent-info';
import { GraphqlGuard } from '@core/authorization';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PubSubEngine } from 'graphql-subscriptions';
import { LogContext } from '@common/enums/logging.context';
import { CommunicationDiscussionMessageReceived } from './dto/discussion.dto.event.message.received';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { DiscussionService } from './discussion.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SUBSCRIPTION_DISCUSSION_MESSAGE } from '@common/constants/providers';
import { TypedSubscription } from '@src/common/decorators';
import { DiscussionMessageReceivedArgs } from './dto/discussion.message.received.args';
import { DiscussionMessageReceivedPayload } from './dto/discussion.message.received.payload';

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

  @UseGuards(GraphqlGuard)
  @TypedSubscription<
    DiscussionMessageReceivedPayload,
    DiscussionMessageReceivedArgs
  >(() => CommunicationDiscussionMessageReceived, {
    description: 'Receive new Discussion messages',
    async resolve(
      this: DiscussionResolverSubscriptions,
      payload,
      args,
      context
    ) {
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
      payload,
      variables,
      context
    ) {
      const agentInfo = context.req?.user;
      const isMatch = variables.discussionID === payload.discussionID;

      this.logger.verbose?.(
        `[User (${agentInfo.email}) DiscussionMsg] - Filtering event id '${payload.eventID}' - match? ${isMatch}`,
        LogContext.SUBSCRIPTIONS
      );

      return isMatch;
    },
  })
  async communicationDiscussionMessageReceived(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: false }) { discussionID }: DiscussionMessageReceivedArgs
  ) {
    const logMsgPrefix = `[User (${agentInfo.email}) DiscussionMsg] - `;
    this.logger.verbose?.(
      `${logMsgPrefix} Subscribing to the following discussion: ${discussionID}`,
      LogContext.SUBSCRIPTIONS
    );

    const discussion = await this.discussionService.getDiscussionOrFail(
      discussionID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      discussion.authorization,
      AuthorizationPrivilege.READ,
      `subscription to discussion messages on: ${discussion.id}`
    );

    return this.subscriptionDiscussionMessage.asyncIterator(
      SubscriptionType.COMMUNICATION_DISCUSSION_MESSAGE_RECEIVED
    );
  }
}
