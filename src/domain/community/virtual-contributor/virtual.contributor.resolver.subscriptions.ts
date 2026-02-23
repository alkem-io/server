import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Resolver } from '@nestjs/graphql';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { VirtualContributorUpdatedSubscriptionPayload } from '@services/subscriptions/subscription-service/dto';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, TypedSubscription } from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { VirtualContributorUpdatedSubscriptionArgs } from './dto/virtual.contributor.updated.subscription.args';
import { VirtualContributorUpdatedSubscriptionResult } from './dto/virtual.contributor.updated.subscription.result';
import { VirtualContributorService } from './virtual.contributor.service';

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
    @CurrentActor() actorContext: ActorContext,
    @Args({ nullable: false })
    { virtualContributorID }: VirtualContributorUpdatedSubscriptionArgs
  ) {
    const vc =
      await this.virtualContributorService.getVirtualContributorByIdOrFail(
        virtualContributorID
      );

    this.authorizationService.grantAccessOrFail(
      actorContext,
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
