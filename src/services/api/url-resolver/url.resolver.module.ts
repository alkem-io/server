import { AuthorizationModule } from '@core/authorization/authorization.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { InnovationHubModule } from '@domain/innovation-hub/innovation.hub.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { InnovationPackModule } from '@library/innovation-pack/innovation.pack.module';
import { Module } from '@nestjs/common';
import { ForumDiscussionLookupModule } from '@platform/forum-discussion-lookup/forum.discussion.lookup.module';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator/url.generator.module';
import { UrlResolverResolverQueries } from './url.resolver.resolver.queries';
import { UrlResolverService } from './url.resolver.service';

@Module({
  imports: [
    AuthorizationModule,
    UserLookupModule,
    OrganizationLookupModule,
    VirtualContributorLookupModule,
    ForumDiscussionLookupModule,
    SpaceLookupModule,
    InnovationPackModule,
    InnovationHubModule,
    UrlGeneratorModule,
  ],
  providers: [UrlResolverService, UrlResolverResolverQueries],
  exports: [],
})
export class UrlResolverModule {}
