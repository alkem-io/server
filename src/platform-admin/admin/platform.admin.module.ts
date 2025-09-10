import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformAdminService } from './platform.admin.service';
import { PlatformAdminResolverQueries } from './platform.admin.resolver.queries';
import { PlatformAdminResolverFields } from './platform.admin.resolver.fields';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { PlatformAdminCommunicationResolverFields } from './platform.admin.resolver.communication.fields';
import { AdminCommunicationModule } from '../domain/communication/admin.communication.module';
import { AdminIdentityModule } from '../core/identity/admin.identity.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { VirtualContributorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';
import { UserModule } from '@domain/community/user/user.module';
import { LibraryModule } from '@library/library/library.module';

@Module({
  imports: [
    AuthorizationModule,
    UserModule,
    OrganizationModule,
    VirtualContributorModule,
    PlatformAuthorizationPolicyModule,
    LibraryModule,
    SpaceModule,
    AdminCommunicationModule,
    AdminIdentityModule,
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
