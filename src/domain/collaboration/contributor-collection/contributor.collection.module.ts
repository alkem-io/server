import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { Module } from '@nestjs/common';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator/url.generator.module';
import { ContributorCollectionService } from './contributor.collection.service';

@Module({
  imports: [
    RoleSetModule,
    CommunityModule,
    EntityResolverModule,
    UrlGeneratorModule,
  ],
  providers: [ContributorCollectionService],
  exports: [ContributorCollectionService],
})
export class ContributorCollectionModule {}
