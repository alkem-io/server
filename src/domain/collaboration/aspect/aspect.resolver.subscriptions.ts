import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AgentInfo } from '@core/authentication/agent-info';
import { GraphqlGuard } from '@core/authorization';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PubSubEngine } from 'graphql-subscriptions';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SUBSCRIPTION_ASPECT_COMMENT } from '@constants/providers';
import { AspectCommentsMessageReceived } from './dto/aspect.dto.event.message.received';
import { AspectService } from '@domain/collaboration/aspect/aspect.service';
import { TypedSubscription } from '@src/common/decorators';
import { AspectMessageReceivedArgs } from './dto/aspect.message.received.args';

@Resolver()
export class AspectResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_ASPECT_COMMENT)
    private subscriptionAspectComment: PubSubEngine,
    private aspectService: AspectService,
    private authorizationService: AuthorizationService
  ) {}

  // Note: the resolving method should not be doing any heavy lifting.
  // Relies on users being cached for performance.
  @UseGuards(GraphqlGuard)
  @TypedSubscription<AspectCommentsMessageReceived, AspectMessageReceivedArgs>(
    () => AspectCommentsMessageReceived,
    {
      description: 'Receive new comment on Aspect',
      resolve(this: AspectResolverSubscriptions, payload, args, context) {
        const agentInfo = context.req?.user;
        const logMsgPrefix = `[User (${agentInfo.email}) Aspect comments] - `;
        this.logger.verbose?.(
          `${logMsgPrefix} sending out new message event for Aspect: ${payload.aspectID} `,
          LogContext.SUBSCRIPTIONS
        );
        return payload;
      },
      async filter(
        this: AspectResolverSubscriptions,
        payload,
        variables,
        context
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
    }
  )
  async aspectCommentsMessageReceived(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: false }) args: AspectMessageReceivedArgs
  ) {
    const logMsgPrefix = `[User (${agentInfo.email}) Aspect comments] - `;
    this.logger.verbose?.(
      `${logMsgPrefix} Subscribing to the following comments of Aspect: ${args.aspectID}`,
      LogContext.SUBSCRIPTIONS
    );
    // check the user has the READ privilege
    const comments = await this.aspectService.getComments(args.aspectID);
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
