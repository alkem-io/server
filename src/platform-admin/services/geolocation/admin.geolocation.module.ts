import { AuthorizationModule } from '@core/authorization/authorization.module';
import { LocationModule } from '@domain/common/location';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { GeoapifyModule } from '@services/external/geoapify';
import { AdminGeoLocationMutations } from './admin.geolocation.resolver.mutations';

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
