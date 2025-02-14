import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { UrlResolverService } from './url.resolver.service';
import { UrlResolverResolverQueries } from './url.resolver.resolver.queries';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { ForumDiscussionLookupModule } from '@platform/forum-discussion-lookup/forum.discussion.lookup.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { InnovationPackModule } from '@library/innovation-pack/innovation.pack.module';
import { InnovationHubModule } from '@domain/innovation-hub/innovation.hub.module';

@Module({
  imports: [
    AuthorizationModule,
    UserLookupModule,
    OrganizationLookupModule,
    VirtualContributorLookupModule,
    ForumDiscussionLookupModule,
    SpaceModule,
    InnovationPackModule,
    InnovationHubModule,
  ],
  providers: [UrlResolverService, UrlResolverResolverQueries],
  exports: [],
})
export class UrlResolverModule {}
