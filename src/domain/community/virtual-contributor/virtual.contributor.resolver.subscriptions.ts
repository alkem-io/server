import { Args, Resolver } from '@nestjs/graphql';
import { CurrentUser, TypedSubscription } from '@src/common/decorators';
import { VirtualContributorService } from './virtual.contributor.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { VirtualContributorUpdatedSubscriptionArgs } from './dto/virtual.contributor.updated.subscription.args';
import { VirtualContributorUpdatedSubscriptionResult } from './dto/virtual.contributor.updated.subscription.result';
import { VirtualContributorUpdatedSubscriptionPayload } from '@services/subscriptions/subscription-service/dto';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class VirtualContributorResolverSubscriptions {
  constructor(
    private virtualContributorService: VirtualContributorService,
    private authorizationService: AuthorizationService,
    private subscriptionService: SubscriptionReadService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @TypedSubscription<
    VirtualContributorUpdatedSubscriptionPayload,
    VirtualContributorUpdatedSubscriptionArgs
  >(() => VirtualContributorUpdatedSubscriptionResult, {
    description: 'Receive updates on virtual contributors',
    resolve(this: VirtualContributorResolverSubscriptions, payload) {
      return payload;
    },
    async filter(
      this: VirtualContributorResolverSubscriptions,
      payload,
      variables
    ) {
      const isMatch =
        variables.virtualContributorID === payload.virtualContributor.id;

      this.logger.verbose?.(
        `[Filtering VirtualContribuor updated event id '${payload.eventID}'; payload VC id ${payload.virtualContributor.id}; variables VC id ${variables.virtualContributorID}- match=${isMatch}`,
        LogContext.SUBSCRIPTIONS
      );
      return isMatch;
    },
  })
  async virtualContributorUpdated(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: false })
    { virtualContributorID }: VirtualContributorUpdatedSubscriptionArgs
  ) {
    const vc =
      await this.virtualContributorService.getVirtualContributorOrFail(
        virtualContributorID
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      vc.authorization,
      AuthorizationPrivilege.READ,
      `subscription to Virtual Contributor updates on: ${vc.id}`
    );

    this.logger.verbose?.(
      `Subscribing for updates for VC ${virtualContributorID}`,
      LogContext.SUBSCRIPTIONS
    );

    return this.subscriptionService.subscribeToVirtualContributorUpdated();
  }
}
