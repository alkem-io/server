import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { VirtualContributorService } from './virtual.contributor.service';
import { VirtualContributorResolverQueries } from './virtual.contributor.resolver.queries';
import { VirtualContributorResolverMutations } from './virtual.contributor.resolver.mutations';
import { VirtualContributorAdapterModule } from '@services/adapters/virtual-contributor-adapter/virtual.contributor.adapter.module';
import { SpaceModule } from '@domain/challenge/space/space.module';
import { RoomModule } from '@domain/communication/room/room.module';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    VirtualContributorAdapterModule,
    SpaceModule,
    RoomModule,
  ],
  providers: [
    VirtualContributorService,
    VirtualContributorResolverMutations,
    VirtualContributorResolverQueries,
  ],
  exports: [VirtualContributorService, VirtualContributorResolverMutations],
})
export class VirtualContributorModule {}
