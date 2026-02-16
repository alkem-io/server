import { AuthorizationModule } from '@core/authorization/authorization.module';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { ContributorModule } from '@domain/community/contributor/contributor.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { AccountLookupModule } from '@domain/space/account.lookup/account.lookup.module';
import { Module } from '@nestjs/common';
import { RoleSetCacheModule } from '../role-set/role.set.service.cache.module';
import { InvitationResolverFields } from './invitation.resolver.fields';
import { InvitationLifecycleResolverFields } from './invitation.resolver.fields.lifecycle';
import { InvitationResolverMutations } from './invitation.resolver.mutations';
import { InvitationAuthorizationService } from './invitation.service.authorization';
import { InvitationLifecycleService } from './invitation.service.lifecycle';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    LifecycleModule,
    ContributorModule,
    VirtualContributorLookupModule,
    UserLookupModule,
    AccountLookupModule,
    RoleSetCacheModule,
  ],
  providers: [
    InvitationService,
    InvitationAuthorizationService,
    InvitationResolverFields,
    InvitationResolverMutations,
    InvitationLifecycleResolverFields,
    InvitationLifecycleService,
  ],
  exports: [
    InvitationService,
    InvitationAuthorizationService,
    InvitationResolverMutations,
  ],
})
export class InvitationModule {}
