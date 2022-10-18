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
import { SUBSCRIPTION_HUB_CHALLENGE_CREATED } from '@common/constants/providers';
import { UUID } from '@domain/common/scalars';
import { TypedSubscription } from '@common/decorators/typed.subscription/typed.subscription.decorator';
import { HubService } from './hub.service';
import { ChallengeCreatedPayload } from './dto/hub.challenge.created.payload';
import { ChallengeCreatedArgs } from './dto/hub.challenge.created.args';
import { ChallengeCreated } from './dto/hub.dto.event.challenge.created';

@Resolver()
export class HubResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_HUB_CHALLENGE_CREATED)
    private challengeCreatedSubscription: PubSubEngine,
    private hubService: HubService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @TypedSubscription<ChallengeCreatedPayload, ChallengeCreatedArgs>(
    () => ChallengeCreated,
    {
      description:
        'Receive new Update messages on Communities the currently authenticated User is a member of.',
      resolve(this: HubResolverSubscriptions, payload, args, context) {
        const agentInfo = context.req.user;
        const logMsgPrefix = `[User (${agentInfo.email}) Hub Challenges] - `;
        this.logger.verbose?.(
          `${logMsgPrefix} sending out event for Challenges on Hub: ${payload.hubID} `,
          LogContext.SUBSCRIPTIONS
        );
        return payload;
      },
      filter(this: HubResolverSubscriptions, payload, variables, context) {
        const agentInfo = context.req.user;
        const logMsgPrefix = `[User (${agentInfo.email}) Hub Challenges] - `;
        this.logger.verbose?.(
          `${logMsgPrefix} Filtering event '${payload.eventID}'`,
          LogContext.SUBSCRIPTIONS
        );

        const isSameHub = payload.hubID === variables.hubID;
        this.logger.verbose?.(
          `${logMsgPrefix} Filter result is ${isSameHub}`,
          LogContext.SUBSCRIPTIONS
        );
        return isSameHub;
      },
    }
  )
  async challengeCreated(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'hubID',
      type: () => UUID,
      description: 'The ID of the Hub to subscribe to.',
      nullable: false,
    })
    hubID: string
  ) {
    const logMsgPrefix = `[User (${agentInfo.email}) Hub Challenges] - `;
    this.logger.verbose?.(
      `${logMsgPrefix} Subscribing to Challenges on the following Hub: ${hubID}`,
      LogContext.SUBSCRIPTIONS
    );
    // Validate
    const hub = await this.hubService.getHubOrFail(hubID);

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      hub.authorization,
      AuthorizationPrivilege.READ,
      `subscription to new Challenges on Hub: ${hub.id}`
    );

    return this.challengeCreatedSubscription.asyncIterator(
      SubscriptionType.CHALLENGE_CREATED
    );
  }
}
