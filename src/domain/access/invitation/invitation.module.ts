import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { Invitation } from '@domain/access/invitation';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { InvitationResolverFields } from './invitation.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { InvitationAuthorizationService } from './invitation.service.authorization';
import { InvitationResolverMutations } from './invitation.resolver.mutations';
import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { InvitationLifecycleResolverFields } from './invitation.resolver.fields.lifecycle';
import { InvitationLifecycleService } from './invitation.service.lifecycle';
import { AccountLookupModule } from '@domain/space/account.lookup/account.lookup.module';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { RoleSetCacheModule } from '../role-set/role.set.service.cache.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    LifecycleModule,
    ActorLookupModule,
    VirtualContributorLookupModule,
    UserLookupModule,
    AccountLookupModule,
    TypeOrmModule.forFeature([Invitation]),
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
