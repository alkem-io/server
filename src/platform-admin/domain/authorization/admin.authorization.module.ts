import { AgentModule } from '@domain/agent/agent/agent.module';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AdminAuthorizationResolverMutations } from './admin.authorization.resolver.mutations';
import { AdminAuthorizationResolverQueries } from './admin.authorization.resolver.queries';
import { AdminAuthorizationService } from './admin.authorization.service';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { AuthResetModule } from '@services/auth-reset/publisher/auth-reset.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { AiPersonaModule } from '@services/ai-server/ai-persona/ai.persona.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { SpaceModule } from '@domain/space/space/space.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    AgentModule,
    UserLookupModule,
    OrganizationLookupModule,
    CredentialModule,
    PlatformAuthorizationPolicyModule,
    NotificationAdapterModule,
    AuthResetModule,
    AiPersonaModule,
    SpaceModule,
  ],
  providers: [
    AdminAuthorizationService,
    AdminAuthorizationResolverMutations,
    AdminAuthorizationResolverQueries,
  ],
  exports: [AdminAuthorizationService],
})
export class AdminAuthorizationModule {}
