import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { AdminGeoLocationMutations } from './admin.geolocation.resolver.mutations';
import { LocationModule } from '@domain/common/location';
import { GeoapifyModule } from '@services/external/geoapify';

@Module({
  imports: [
    AuthorizationModule,
    GeoapifyModule,
    PlatformAuthorizationPolicyModule,
    LocationModule,
  ],
  providers: [AdminGeoLocationMutations],
  exports: [],
})
export class AdminGeoLocationModule {}
