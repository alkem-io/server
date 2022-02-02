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
      if (!commentsIDs) {
        // If subscribed to all then need to check on every update the authorization to see it
        this.logger.verbose?.(
          `${logMsgPrefix} Subscribed to all comments; filtering by Authorization to see ${payload.commentsID}`,
          LogContext.SUBSCRIPTIONS
        );
        const comments = await this.commentsService.getCommentsOrFail(
          payload.commentsID
        );
        const filter = await this.authorizationService.isAccessGranted(
          agentInfo,
          comments.authorization,
          AuthorizationPrivilege.READ
        );
        this.logger.verbose?.(
          `${logMsgPrefix} Filter result: ${filter}`,
          LogContext.SUBSCRIPTIONS
        );
        return filter;
      } else {
        const inList = commentsIDs.includes(payload.commentsID);
        this.logger.verbose?.(
          `${logMsgPrefix} Filter result is ${inList}`,
          LogContext.SUBSCRIPTIONS
        );
        return inList;
      }
    },
  })
  async communicationUpdateMessageReceived(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'commentsIDs',
      type: () => [UUID],
      description:
        'The IDs of the Comments to subscribe to; if omitted subscribe to all Comments.',
      nullable: true,
    })
    commentsIDs: string[]
  ) {
    const logMsgPrefix = `[User (${agentInfo.email}) Comments] - `;
    if (commentsIDs) {
      this.logger.verbose?.(
        `${logMsgPrefix} Subscribing to the following comments: ${commentsIDs}`,
        LogContext.SUBSCRIPTIONS
      );
      for (const commentsID of commentsIDs) {
        // check the user has the READ privilege
        const comments = await this.commentsService.getCommentsOrFail(
          commentsID
        );
        await this.authorizationService.grantAccessOrFail(
          agentInfo,
          comments.authorization,
          AuthorizationPrivilege.READ,
          `subscription to comments on: ${comments.displayName}`
        );
      }
    } else {
      this.logger.verbose?.(
        `${logMsgPrefix} Subscribing to all comments`,
        LogContext.SUBSCRIPTIONS
      );
      // Todo: either disable this option or find a way to do this once in this method and pass the resulting
      // array of discussionIDs to the filter call
    }

    return this.subscriptionUpdateMessage.asyncIterator(
      SubscriptionType.COMMUNICATION_UPDATE_MESSAGE_RECEIVED
    );
  }
}
