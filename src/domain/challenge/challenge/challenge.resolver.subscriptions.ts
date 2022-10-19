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
import { SUBSCRIPTION_OPPORTUNITY_CREATED } from '@common/constants/providers';
import { TypedSubscription } from '@common/decorators/typed.subscription/typed.subscription.decorator';
import { ChallengeService } from './challenge.service';
import { OpportunityCreatedPayload } from './dto/challenge.opportunity.created.payload';
import { OpportunityCreatedArgs } from './dto/challenge.opportunity.created.args';
import { OpportunityCreated } from './dto/challenge.dto.event.opportunity.created';

@Resolver()
export class ChallengeResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_OPPORTUNITY_CREATED)
    private opportunityCreatedSubscription: PubSubEngine,
    private challengeService: ChallengeService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @TypedSubscription<OpportunityCreatedPayload, OpportunityCreatedArgs>(
    () => OpportunityCreated,
    {
      description: 'Receive new Opportunities created on the Challenge.',
      resolve(this: ChallengeResolverSubscriptions, payload, args, context) {
        const agentInfo = context.req.user;
        const logMsgPrefix = `[OpportunityCreated subscription] - [${agentInfo.email}] -`;
        this.logger.verbose?.(
          `${logMsgPrefix} sending out event for created opportunity on Challenge: ${payload.challengeID} `,
          LogContext.SUBSCRIPTIONS
        );
        return payload;
      },
      filter(
        this: ChallengeResolverSubscriptions,
        payload,
        variables,
        context
      ) {
        const agentInfo = context.req.user;
        const logMsgPrefix = `[OpportunityCreated subscription] - [${agentInfo.email}] -`;
        this.logger.verbose?.(
          `${logMsgPrefix} Filtering event '${payload.eventID}'`,
          LogContext.SUBSCRIPTIONS
        );

        const isSameChallenge = payload.challengeID === variables.challengeID;
        this.logger.verbose?.(
          `${logMsgPrefix} Filter result is ${isSameChallenge}`,
          LogContext.SUBSCRIPTIONS
        );
        return isSameChallenge;
      },
    }
  )
  async opportunityCreated(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      nullable: false,
    })
    args: OpportunityCreatedArgs
  ) {
    const logMsgPrefix = '[OpportunityCreated subscription] -';
    this.logger.verbose?.(
      `${logMsgPrefix} User ${agentInfo.email} subscribed for new opportunities on the following Challenge: ${args.challengeID}`,
      LogContext.SUBSCRIPTIONS
    );
    // Validate
    const challenge = await this.challengeService.getChallengeOrFail(
      args.challengeID
    );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      challenge.authorization,
      AuthorizationPrivilege.READ,
      `subscription to new Opportunities on Challenge: ${challenge.id}`
    );

    return this.opportunityCreatedSubscription.asyncIterator(
      SubscriptionType.OPPORTUNITY_CREATED
    );
  }
}
