import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { LicensingGrantedEntitlement } from '@platform/licensing/dto/licensing.dto.granted.entitlement';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
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
    @CurrentActor() actorContext: ActorContext
  ) {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `licensing wingback subscription create test customer: ${actorContext.actorID}`
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
    @CurrentActor() actorContext: ActorContext
  ) {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `licensing wingback subscription entitlements: ${actorContext.actorID}`
    );
    return this.licensingWingbackSubscriptionService.getEntitlements(
      customerId
    );
  }
}
