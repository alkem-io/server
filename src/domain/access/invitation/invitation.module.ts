import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Invitation } from '@domain/access/invitation';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { ActorModule } from '@domain/actor/actor/actor.module';
import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { VirtualActorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { AccountLookupModule } from '@domain/space/account.lookup/account.lookup.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
    ActorModule,
    ActorLookupModule,
    VirtualActorLookupModule,
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
