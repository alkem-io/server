import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { LicensingGrantedEntitlement } from '@platform/licensing/dto/licensing.dto.granted.entitlement';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser } from '@src/common/decorators';
import { randomUUID } from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LicensingWingbackSubscriptionService } from './licensing.wingback.subscription.service';

@InstrumentResolver()
@Resolver()
export class LicensingWingbackSubscriptionServiceResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    private licensingWingbackSubscriptionService: LicensingWingbackSubscriptionService
  ) {}

  // todo: move
  @Mutation(() => String, {
    description: 'Create a test customer on wingback.',
  })
  public async adminWingbackCreateTestCustomer(
    @CurrentUser() agentInfo: AgentInfo
  ) {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `licensing wingback subscription create test customer: ${agentInfo.email}`
    );
    const res = await this.licensingWingbackSubscriptionService.createCustomer({
      name: `Test User ${randomUUID()}`,
      emails: {
        invoice: `main${randomUUID()}@alkem.io`,
      },
      tax_details: {
        vat_id: 'vat_id',
      },
      notes: 'notes',
      customer_reference: `your-internal-user-id-${randomUUID()}`,
      contracts: [],
    });
    return res.id;
  }

  // todo: move
  @Mutation(() => [LicensingGrantedEntitlement], {
    description: 'Get wingback customer entitlements.',
  })
  public async adminWingbackGetCustomerEntitlements(
    @Args('customerID') customerId: string,
    @CurrentUser() agentInfo: AgentInfo
  ) {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `licensing wingback subscription entitlements: ${agentInfo.email}`
    );
    return this.licensingWingbackSubscriptionService.getEntitlements(
      customerId
    );
  }
}
