import { Module } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { UserModule } from '@domain/community/user/user.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { RegistrationResolverMutations } from './registration.resolver.mutations';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { InvitationModule } from '@domain/community/invitation/invitation.module';
import { ApplicationModule } from '@domain/community/application/application.module';
import { PreferenceSetModule } from '@domain/common/preference-set/preference.set.module';
import { PlatformInvitationModule } from '@platform/invitation/platform.invitation.module';
import { PlatformRoleModule } from '@platform/platfrom.role/platform.role.module';
import { CommunityRoleModule } from '@domain/community/community-role/community.role.module';
import { OrganizationRoleModule } from '@domain/community/organization-role/organization.role.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    NotificationAdapterModule,
    CommunityRoleModule,
    UserModule,
    PreferenceSetModule,
    OrganizationModule,
    OrganizationRoleModule,
    InvitationModule,
    PlatformInvitationModule,
    PlatformRoleModule,
    ApplicationModule,
  ],
  providers: [RegistrationService, RegistrationResolverMutations],
  exports: [RegistrationService, RegistrationResolverMutations],
})
export class RegistrationModule {}
