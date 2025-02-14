import { Module } from '@nestjs/common';
import { SpaceModule } from '@domain/space/space/space.module';
import { RolesService } from './roles.service';
import { RolesResolverQueries } from './roles.resolver.queries';
import { CommunityModule } from '@domain/community/community/community.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ApplicationModule } from '@domain/access/application/application.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { SpaceFilterModule } from '@services/infrastructure/space-filter/space.filter.module';
import { InvitationModule } from '@domain/access/invitation/invitation.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { RolesResolverFields } from './roles.resolver.fields';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ApplicationModule,
    InvitationModule,
    CommunityModule,
    UserLookupModule,
    OrganizationLookupModule,
    VirtualContributorLookupModule,
    ContributorLookupModule,
    SpaceModule,
    PlatformAuthorizationPolicyModule,
    SpaceFilterModule,
    EntityResolverModule,
  ],
  providers: [RolesService, RolesResolverQueries, RolesResolverFields],
  exports: [RolesService],
})
export class RolesModule {}
