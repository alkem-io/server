import { Module } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { UserModule } from '@domain/community/user/user.module';
import { RegistrationResolverMutations } from './registration.resolver.mutations';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { InvitationModule } from '@domain/access/invitation/invitation.module';
import { ApplicationModule } from '@domain/access/application/application.module';
import { PlatformInvitationModule } from '@domain/access/invitation.platform/platform.invitation.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AccountModule } from '@domain/space/account/account.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';

@Module({
  imports: [
    AccountModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    NotificationAdapterModule,
    RoleSetModule,
    UserModule,
    OrganizationModule,
    OrganizationLookupModule,
    InvitationModule,
    PlatformInvitationModule,
    PlatformAuthorizationPolicyModule,
    ApplicationModule,
    KratosModule,
  ],
  providers: [RegistrationService, RegistrationResolverMutations],
  exports: [RegistrationService, RegistrationResolverMutations],
})
export class RegistrationModule {}
