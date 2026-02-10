import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ApplicationModule } from '@domain/access/application/application.module';
import { InvitationModule } from '@domain/access/invitation/invitation.module';
import { PlatformInvitationModule } from '@domain/access/invitation.platform/platform.invitation.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { UserModule } from '@domain/community/user/user.module';
import { AccountModule } from '@domain/space/account/account.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { RegistrationResolverMutations } from './registration.resolver.mutations';
import { RegistrationService } from './registration.service';

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
  ],
  providers: [RegistrationService, RegistrationResolverMutations],
  exports: [RegistrationService, RegistrationResolverMutations],
})
export class RegistrationModule {}
