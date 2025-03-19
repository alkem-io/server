import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { SpaceAboutMembershipService } from './space.about.membership.service';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { SpaceAboutMembershipResolverFields } from './space.about.membership.resolver.fields';
import { RoleSetMembershipStatusDataLoader } from '@domain/access/role-set/role.set.data.loader.membership.status';
import { CommunityModule } from '@domain/community/community/community.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    RoleSetModule,
    CommunityModule,
  ],
  providers: [
    SpaceAboutMembershipResolverFields,
    SpaceAboutMembershipService,
    RoleSetMembershipStatusDataLoader,
  ],
  exports: [SpaceAboutMembershipService],
})
export class SpaceAboutMembershipModule {}
