import { AuthorizationModule } from '@core/authorization/authorization.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { InnovationHubModule } from '@domain/innovation-hub/innovation.hub.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { TemplateModule } from '@domain/template/template/template.module';
import { InnovationPackModule } from '@library/innovation-pack/innovation.pack.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { LookupByNameResolverFields } from './lookup.by.name.resolver.fields';
import { LookupByNameResolverQueries } from './lookup.by.name.resolver.queries';
import { LookupByNameService } from './lookup.by.name.service';

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
    SpaceLookupModule,
  ],
  providers: [
    LookupByNameService,
    LookupByNameResolverQueries,
    LookupByNameResolverFields,
  ],
  exports: [LookupByNameService],
})
export class LookupByNameModule {}
