import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { WingbackManagerModule } from '@services/external/wingback';
import { LicensingWingbackSubscriptionServiceResolverMutations } from './licensing.wingback.subscription.resolver.mutations';
import { LicensingWingbackSubscriptionService } from './licensing.wingback.subscription.service';

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
