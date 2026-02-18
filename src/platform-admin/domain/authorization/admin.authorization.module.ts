import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ActorModule } from '@domain/actor/actor/actor.module';
import { CredentialModule } from '@domain/actor/credential/credential.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { VirtualActorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';
import { SpaceModule } from '@domain/space/space/space.module';
import { Module } from '@nestjs/common';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { AuthResetModule } from '@services/auth-reset/publisher/auth-reset.module';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { AdminAuthorizationResolverMutations } from './admin.authorization.resolver.mutations';
import { AdminAuthorizationResolverQueries } from './admin.authorization.resolver.queries';
import { AdminAuthorizationService } from './admin.authorization.service';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ActorModule,
    UserLookupModule,
    OrganizationLookupModule,
    CredentialModule,
    PlatformAuthorizationPolicyModule,
    NotificationAdapterModule,
    AuthResetModule,
    SpaceModule,
    VirtualActorModule,
  ],
  providers: [
    AdminAuthorizationService,
    AdminAuthorizationResolverMutations,
    AdminAuthorizationResolverQueries,
  ],
  exports: [AdminAuthorizationService],
})
export class AdminAuthorizationModule {}
