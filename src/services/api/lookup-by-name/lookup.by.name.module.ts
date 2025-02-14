import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { LookupByNameService } from './lookup.by.name.service';
import { LookupByNameResolverQueries } from './lookup.by.name.resolver.queries';
import { LookupByNameResolverFields } from './lookup.by.name.resolver.fields';
import { InnovationHubModule } from '@domain/innovation-hub/innovation.hub.module';
import { InnovationPackModule } from '@library/innovation-pack/innovation.pack.module';
import { TemplateModule } from '@domain/template/template/template.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { SpaceModule } from '@domain/space/space/space.module';

@Module({
  imports: [
    AuthorizationModule,
    InnovationHubModule,
    InnovationPackModule,
    TemplateModule,
    UserLookupModule,
    OrganizationLookupModule,
    VirtualContributorLookupModule,
    PlatformAuthorizationPolicyModule,
    SpaceModule,
  ],
  providers: [
    LookupByNameService,
    LookupByNameResolverQueries,
    LookupByNameResolverFields,
  ],
  exports: [LookupByNameService],
})
export class LookupByNameModule {}
