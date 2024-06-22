import { Module } from '@nestjs/common';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { UserModule } from '@domain/community/user/user.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { RolesService } from './roles.service';
import { RolesResolverQueries } from './roles.resolver.queries';
import { CommunityModule } from '@domain/community/community/community.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ApplicationModule } from '@domain/community/application/application.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { SpaceFilterModule } from '@services/infrastructure/space-filter/space.filter.module';
import { InvitationModule } from '@domain/community/invitation/invitation.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { RolesResolverFields } from './roles.resolver.fields';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ApplicationModule,
    InvitationModule,
    UserModule,
    UserGroupModule,
    CommunityModule,
    OrganizationModule,
    SpaceModule,
    PlatformAuthorizationPolicyModule,
    SpaceFilterModule,
    EntityResolverModule,
  ],
  providers: [RolesService, RolesResolverQueries, RolesResolverFields],
  exports: [RolesService],
})
export class RolesModule {}
