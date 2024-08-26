import { Args, Resolver, Subscription } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { VirtualContributorService } from './virtual.contributor.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { VirtualContributorUpdatedSubscriptionArgs } from './dto/virtual.contributor.updated.subscription.args';
import { VirtualContributorUpdatedSubscriptionResult } from './dto/virtual.contributor.updated.subscription.result';

@Resolver()
export class VirtualContributorResolverSubscriptions {
  constructor(
    private virtualContributorService: VirtualContributorService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private subscriptionService: SubscriptionReadService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Subscription(() => VirtualContributorUpdatedSubscriptionResult, {
    nullable: false,
    description: 'Receive updates on virtual contributors',
    async filter(
      this: VirtualContributorResolverSubscriptions,
      payload,
      variables
    ) {
      const isMatch =
        variables.virtualContributorId === payload.virtualContributor.nameID;

      this.logger.verbose?.(
        `[Filtering VirtualContribuor updated event id '${payload.eventID}'; VC id ${payload.virtualContributor.nameID}- match=${isMatch}`,
        LogContext.SUBSCRIPTIONS
      );
      return isMatch;
    },
  })
  async virtualContributorUpdated(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: true })
    { virtualContributorId }: VirtualContributorUpdatedSubscriptionArgs
  ) {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();

    const hasAccess = this.authorizationService.isAccessGranted(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN
    );

    if (!hasAccess) {
      return {};
    }
    const vc =
      await this.virtualContributorService.getVirtualContributorOrFail(
        virtualContributorId
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      vc.authorization,
      AuthorizationPrivilege.READ,
      `subscription to Virtual Contributor updates on: ${vc.id}`
    );

    return this.subscriptionService.subscribeToVirtualContributorUpdated();
  }
}
