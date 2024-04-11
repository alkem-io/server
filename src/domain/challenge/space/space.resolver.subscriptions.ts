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
import { TypedSubscription } from '@common/decorators/typed.subscription/typed.subscription.decorator';
import { SpaceService } from './space.service';
import { SubspaceCreatedPayload } from './dto/space.subspace.created.payload';
import { SubspaceCreatedArgs } from './dto/space.challenge.created.args';
import { SubspaceCreated as SubspaceCreated } from './dto/space.dto.event.subspace.created';
import { SUBSCRIPTION_SUBSPACE_CREATED } from '@common/constants/providers';

@Resolver()
export class SpaceResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_SUBSPACE_CREATED)
    private subspaceCreatedSubscription: PubSubEngine,
    private spaceService: SpaceService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @TypedSubscription<SubspaceCreatedPayload, SubspaceCreatedArgs>(
    () => SubspaceCreated,
    {
      description: 'Receive new Challenges created on the Space.',
      resolve(this: SpaceResolverSubscriptions, payload, args, context) {
        const agentInfo = context.req.user;
        const logMsgPrefix = `[SubspaceCreated subscription] - [${agentInfo.email}] -`;
        this.logger.verbose?.(
          `${logMsgPrefix} sending out event for created challenge on Space: ${payload.journeyID} `,
          LogContext.SUBSCRIPTIONS
        );
        return payload;
      },
      filter(this: SpaceResolverSubscriptions, payload, variables, context) {
        const agentInfo = context.req.user;
        const logMsgPrefix = `[SubspaceCreated subscription] - [${agentInfo.email}] -`;
        this.logger.verbose?.(
          `${logMsgPrefix} Filtering event '${payload.eventID}'`,
          LogContext.SUBSCRIPTIONS
        );

        const isSameSpace = payload.journeyID === variables.journeyID;
        this.logger.verbose?.(
          `${logMsgPrefix} Filter result is ${isSameSpace}`,
          LogContext.SUBSCRIPTIONS
        );
        return isSameSpace;
      },
    }
  )
  async subspaceCreated(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      nullable: false,
    })
    args: SubspaceCreatedArgs
  ) {
    const logMsgPrefix = '[SubspaceCreated subscription] -';
    this.logger.verbose?.(
      `${logMsgPrefix} User ${agentInfo.email} subscribed for new subspaced on the following Space: ${args.journeyID}`,
      LogContext.SUBSCRIPTIONS
    );
    // Validate
    const space = await this.spaceService.getSpaceOrFail(args.journeyID);

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.READ,
      `subscription to new Challenges on Space: ${space.id}`
    );

    return this.subspaceCreatedSubscription.asyncIterator(
      SubscriptionType.SUBSPACE_CREATED
    );
  }
}
