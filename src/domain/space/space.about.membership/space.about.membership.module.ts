import { AuthorizationModule } from '@core/authorization/authorization.module';
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
  providers: [SpaceAboutMembershipResolverFields, SpaceAboutMembershipService],
  exports: [SpaceAboutMembershipService],
})
export class SpaceAboutMembershipModule {}
