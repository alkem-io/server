import { AuthorizationModule } from '@core/authorization/authorization.module';
import { RoleSetMembershipStatusDataLoader } from '@domain/access/role-set/role.set.data.loader.membership.status';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { Module } from '@nestjs/common';
import { SpaceAboutMembershipResolverFields } from './space.about.membership.resolver.fields';
import { SpaceAboutMembershipService } from './space.about.membership.service';

@Module({
  imports: [
    CommunityModule,
    RoleSetModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
  ],
  providers: [
    SpaceAboutMembershipResolverFields,
    SpaceAboutMembershipService,
    RoleSetMembershipStatusDataLoader,
  ],
  exports: [SpaceAboutMembershipService],
})
export class SpaceAboutMembershipModule {}
