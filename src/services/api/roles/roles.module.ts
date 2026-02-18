import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ApplicationModule } from '@domain/access/application/application.module';
import { InvitationModule } from '@domain/access/invitation/invitation.module';
import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { VirtualActorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { Module } from '@nestjs/common';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { SpaceFilterModule } from '@services/infrastructure/space-filter/space.filter.module';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { RolesResolverFields } from './roles.resolver.fields';
import { RolesResolverQueries } from './roles.resolver.queries';
import { RolesService } from './roles.service';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ApplicationModule,
    InvitationModule,
    CommunityModule,
    UserLookupModule,
    OrganizationLookupModule,
    VirtualActorLookupModule,
    ActorLookupModule,
    SpaceModule,
    PlatformAuthorizationPolicyModule,
    SpaceFilterModule,
    EntityResolverModule,
  ],
  providers: [RolesService, RolesResolverQueries, RolesResolverFields],
  exports: [RolesService],
})
export class RolesModule {}
