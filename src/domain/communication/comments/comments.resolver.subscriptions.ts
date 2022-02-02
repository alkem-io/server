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
import { CommentsService } from './comments.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SUBSCRIPTION_UPDATE_MESSAGE } from '@common/constants/providers';
import { CommentsMessageReceived } from './dto/comments.dto.event.message.received';

@Resolver()
export class CommentsResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_UPDATE_MESSAGE)
    private subscriptionUpdateMessage: PubSubEngine,
    private commentsService: CommentsService,
    private authorizationService: AuthorizationService
  ) {}

  // Note: the resolving method should not be doing any heavy lifting.
  // Relies on users being cached for performance.
  @UseGuards(GraphqlGuard)
  @Subscription(() => CommentsMessageReceived, {
    description:
      'Receive new Update messages on Communities the currently authenticated User is a member of.',
    async resolve(
      this: CommentsResolverSubscriptions,
      value: CommentsMessageReceived,
      _: any,
      context: any
    ): Promise<CommentsMessageReceived> {
      const agentInfo = context.req?.user;
      const logMsgPrefix = `[User (${agentInfo.email}) Comments] - `;
      this.logger.verbose?.(
        `${logMsgPrefix} sending out event for Comments: ${value.commentsID} `,
        LogContext.SUBSCRIPTIONS
      );
      return value;
    },
    async filter(
      this: CommentsResolverSubscriptions,
      payload: CommentsMessageReceived,
      variables: any,
      context: any
    ) {
      const agentInfo = context.req?.user;
      const logMsgPrefix = `[User (${agentInfo.email}) Comments] - `;
      const commentsIDs: string[] = variables.commentsIDs;
      this.logger.verbose?.(
        `${logMsgPrefix}  Filtering event '${payload.eventID}'`,
        LogContext.SUBSCRIPTIONS
      );

      const inList = commentsIDs.includes(payload.commentsID);
      this.logger.verbose?.(
        `${logMsgPrefix} Filter result is ${inList}`,
        LogContext.SUBSCRIPTIONS
      );
      return inList;
    },
  })
  async communicationUpdateMessageReceived(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'commentsID',
      type: () => [UUID],
      description: 'The ID of the Comments to subscribe to.',
      nullable: false,
    })
    commentsID: string
  ) {
    const logMsgPrefix = `[User (${agentInfo.email}) Comments] - `;
    this.logger.verbose?.(
      `${logMsgPrefix} Subscribing to the following comments: ${commentsID}`,
      LogContext.SUBSCRIPTIONS
    );
    // check the user has the READ privilege
    const comments = await this.commentsService.getCommentsOrFail(commentsID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      comments.authorization,
      AuthorizationPrivilege.READ,
      `subscription to comments on: ${comments.displayName}`
    );

    return this.subscriptionUpdateMessage.asyncIterator(
      SubscriptionType.COMMUNICATION_COMMENTS_MESSAGE_RECEIVED
    );
  }
}
