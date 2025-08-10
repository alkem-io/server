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
import { PlatformAdminCommunicationResolverFields } from './platform.admin.resolver.communication.fields';
import { AdminCommunicationModule } from '../domain/communication/admin.communication.module';
import { SpaceModule } from '@domain/space/space/space.module';

@Module({
  imports: [
    AuthorizationModule,
    InnovationHubModule,
    InnovationPackModule,
    UserLookupModule,
    OrganizationLookupModule,
    VirtualContributorLookupModule,
    PlatformAuthorizationPolicyModule,
    SpaceModule,
    AdminCommunicationModule,
  ],
  providers: [
    PlatformAdminService,
    PlatformAdminResolverQueries,
    PlatformAdminResolverFields,
    PlatformAdminCommunicationResolverFields,
  ],
  exports: [PlatformAdminService],
})
export class PlatformAdminModule {}
