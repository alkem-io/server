import { Module } from '@nestjs/common';
import { WingbackManagerModule } from '@services/external/wingback';
import { LicensingWingbackSubscriptionService } from './licensing.wingback.subscription.service';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { LicensingWingbackSubscriptionServiceResolverMutations } from './licensing.wingback.subscription.resolver.mutations';
import { AuthorizationModule } from '@core/authorization/authorization.module';

@Module({
  imports: [
    WingbackManagerModule,
    PlatformAuthorizationPolicyModule,
    AuthorizationModule,
  ],
  providers: [
    LicensingWingbackSubscriptionService,
    LicensingWingbackSubscriptionServiceResolverMutations,
  ],
  exports: [LicensingWingbackSubscriptionService],
})
export class LicensingWingbackSubscriptionModule {}
