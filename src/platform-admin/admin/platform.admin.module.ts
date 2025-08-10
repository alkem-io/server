import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformAdminService } from './platform.admin.service';
import { PlatformAdminResolverQueries } from './platform.admin.resolver.queries';
import { PlatformAdminResolverFields } from './platform.admin.resolver.fields';
import { InnovationHubModule } from '@domain/innovation-hub/innovation.hub.module';
import { InnovationPackModule } from '@library/innovation-pack/innovation.pack.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';

@Module({
  imports: [
    AuthorizationModule,
    InnovationHubModule,
    InnovationPackModule,
    UserLookupModule,
    OrganizationLookupModule,
    VirtualContributorLookupModule,
    PlatformAuthorizationPolicyModule,
    SpaceLookupModule,
  ],
  providers: [
    PlatformAdminService,
    PlatformAdminResolverQueries,
    PlatformAdminResolverFields,
  ],
  exports: [PlatformAdminService],
})
export class PlatformAdminModule {}
