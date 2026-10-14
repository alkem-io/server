import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { SpaceCollectionService } from './space.collection.service';

// NOTE: deliberately does NOT import SpaceModule — that closes a module cycle
// (CalloutFramingModule → SpaceCollectionModule → SpaceModule → … →
// CalloutModule → CalloutFramingModule). The host space + its subspaces are
// resolved via the cycle-free CommunityResolverService (EntityResolverModule),
// and subspace ordering is a pure helper shared with SpaceService.getSubspaces.
// AuthorizationModule is the workspace#084 addition: the CUSTOM read path
// applies a per-viewer READ filter. It closes no cycle — AuthorizationModule
// has `imports: []`. `@InjectEntityManager()` needs no module import.
@Module({
  imports: [EntityResolverModule, AuthorizationModule],
  providers: [SpaceCollectionService],
  exports: [SpaceCollectionService],
})
export class SpaceCollectionModule {}
