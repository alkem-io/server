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
import { SUBSCRIPTION_CHALLENGE_CREATED } from '@common/constants/providers';
import { TypedSubscription } from '@common/decorators/typed.subscription/typed.subscription.decorator';
import { SpaceService } from './space.service';
import { ChallengeCreatedPayload } from './dto/space.challenge.created.payload';
import { ChallengeCreatedArgs } from './dto/space.challenge.created.args';
import { ChallengeCreated } from './dto/space.dto.event.challenge.created';

@Resolver()
export class SpaceResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_CHALLENGE_CREATED)
    private challengeCreatedSubscription: PubSubEngine,
    private spaceService: SpaceService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @TypedSubscription<ChallengeCreatedPayload, ChallengeCreatedArgs>(
    () => ChallengeCreated,
    {
      description: 'Receive new Challenges created on the Space.',
      resolve(this: SpaceResolverSubscriptions, payload, args, context) {
        const agentInfo = context.req.user;
        const logMsgPrefix = `[ChallengeCreated subscription] - [${agentInfo.email}] -`;
        this.logger.verbose?.(
          `${logMsgPrefix} sending out event for created challenge on Space: ${payload.spaceID} `,
          LogContext.SUBSCRIPTIONS
        );
        return payload;
      },
      filter(this: SpaceResolverSubscriptions, payload, variables, context) {
        const agentInfo = context.req.user;
        const logMsgPrefix = `[ChallengeCreated subscription] - [${agentInfo.email}] -`;
        this.logger.verbose?.(
          `${logMsgPrefix} Filtering event '${payload.eventID}'`,
          LogContext.SUBSCRIPTIONS
        );

        const isSameSpace = payload.spaceID === variables.spaceID;
        this.logger.verbose?.(
          `${logMsgPrefix} Filter result is ${isSameSpace}`,
          LogContext.SUBSCRIPTIONS
        );
        return isSameSpace;
      },
    }
  )
  async challengeCreated(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      nullable: false,
    })
    args: ChallengeCreatedArgs
  ) {
    const logMsgPrefix = '[ChallengeCreated subscription] -';
    this.logger.verbose?.(
      `${logMsgPrefix} User ${agentInfo.email} subscribed for new challenges on the following Space: ${args.spaceID}`,
      LogContext.SUBSCRIPTIONS
    );
    // Validate
    const space = await this.spaceService.getSpaceOrFail(args.spaceID);

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.READ,
      `subscription to new Challenges on Space: ${space.id}`
    );

    return this.challengeCreatedSubscription.asyncIterator(
      SubscriptionType.CHALLENGE_CREATED
    );
  }
}
