import { AgentModule } from '@domain/agent/agent/agent.module';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AdminAuthorizationResolverMutations } from './admin.authorization.resolver.mutations';
import { AdminAuthorizationResolverQueries } from './admin.authorization.resolver.queries';
import { AdminAuthorizationService } from './admin.authorization.service';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { AuthResetModule } from '@services/auth-reset/publisher/auth-reset.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    AgentModule,
    UserModule,
    OrganizationModule,
    CredentialModule,
    PlatformAuthorizationPolicyModule,
    NotificationAdapterModule,
    AuthResetModule,
  ],
  providers: [
    AdminAuthorizationService,
    AdminAuthorizationResolverMutations,
    AdminAuthorizationResolverQueries,
  ],
  exports: [AdminAuthorizationService],
})
export class AdminAuthorizationModule {}
