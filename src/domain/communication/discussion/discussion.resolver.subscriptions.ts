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
    @Args({
      name: 'discussionID',
      type: () => UUID,
      description: 'The ID of the Discussion to subscribe to.',
    })
    discussionID: string
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
      `subscription to discussion messages on: ${discussion.displayName}`
    );

    return this.subscriptionDiscussionMessage.asyncIterator(
      SubscriptionType.COMMUNICATION_DISCUSSION_MESSAGE_RECEIVED
    );
  }
}
