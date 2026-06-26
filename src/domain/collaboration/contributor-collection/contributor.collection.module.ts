import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { Module } from '@nestjs/common';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator/url.generator.module';
import { ContributorCollectionService } from './contributor.collection.service';

// NOTE: deliberately does NOT import CommunityModule — that closes a module cycle
// (CalloutFramingModule → ContributorCollectionModule → CommunityModule → … →
// CalloutModule → CalloutFramingModule) which makes a transitive import resolve
// as `undefined` at load. The RoleSet is resolved via the cycle-free
// CommunityResolverService (EntityResolverModule) + the injected EntityManager.
@Module({
  imports: [RoleSetModule, EntityResolverModule, UrlGeneratorModule],
  providers: [ContributorCollectionService],
  exports: [ContributorCollectionService],
})
export class ContributorCollectionModule {}
