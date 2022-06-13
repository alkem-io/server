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
import { CommentsService } from '../../communication/comments/comments.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SUBSCRIPTION_ASPECT_COMMENT } from '@constants/providers';
import { AspectCommentsMessageReceived } from './dto/aspect.dto.event.message.received';
import { AspectService } from '@domain/context/aspect/aspect.service';

@Resolver()
export class AspectResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_ASPECT_COMMENT)
    private subscriptionAspectComment: PubSubEngine,
    private aspectService: AspectService,
    private commentsService: CommentsService,
    private authorizationService: AuthorizationService
  ) {}

  // Note: the resolving method should not be doing any heavy lifting.
  // Relies on users being cached for performance.
  @UseGuards(GraphqlGuard)
  @Subscription(() => AspectCommentsMessageReceived, {
    description: 'Receive new comment on Aspect',
    async resolve(
      this: AspectResolverSubscriptions,
      value: AspectCommentsMessageReceived,
      _: any,
      context: any
    ): Promise<AspectCommentsMessageReceived> {
      const agentInfo = context.req?.user;
      const logMsgPrefix = `[User (${agentInfo.email}) Aspect comments] - `;
      this.logger.verbose?.(
        `${logMsgPrefix} sending out new message event for Aspect: ${value.aspectID} `,
        LogContext.SUBSCRIPTIONS
      );
      return value;
    },
    async filter(
      this: AspectResolverSubscriptions,
      payload: AspectCommentsMessageReceived,
      variables: { aspectID: string },
      context: { req: { user: AgentInfo } }
    ) {
      const agentInfo = context.req.user;
      const logMsgPrefix = `[User (${agentInfo.email}) Aspect comments]`;
      this.logger.verbose?.(
        `${logMsgPrefix} Filtering event '${payload.eventID}'`,
        LogContext.SUBSCRIPTIONS
      );

      const isSameCommentsInstance = payload.aspectID === variables.aspectID;
      this.logger.verbose?.(
        `${logMsgPrefix} Filter result is ${isSameCommentsInstance}`,
        LogContext.SUBSCRIPTIONS
      );
      return isSameCommentsInstance;
    },
  })
  async aspectCommentsMessageReceived(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'aspectID',
      type: () => UUID,
      description: 'The ID of the Aspect to subscribe to.',
      nullable: false,
    })
    aspectID: string
  ) {
    const logMsgPrefix = `[User (${agentInfo.email}) Aspect comments] - `;
    this.logger.verbose?.(
      `${logMsgPrefix} Subscribing to the following comments of Aspect: ${aspectID}`,
      LogContext.SUBSCRIPTIONS
    );
    // check the user has the READ privilege
    const comments = await this.aspectService.getComments(aspectID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      comments.authorization,
      AuthorizationPrivilege.READ,
      `subscription to aspect comments on: ${comments.displayName}`
    );

    return this.subscriptionAspectComment.asyncIterator(
      SubscriptionType.ASPECT_COMMENTS_MESSAGE_RECEIVED
    );
  }
}
