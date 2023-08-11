import { Module } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { UserModule } from '@domain/community/user/user.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { RegistrationResolverMutations } from './registration.resolver.mutations';
import { PreferenceSetModule } from '@domain/common/preference-set/preference.set.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { InvitationExternalModule } from '@domain/community/invitation.external/invitation.external.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { InvitationModule } from '@domain/community/invitation/invitation.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@domain/community/user/user.entity';
import { ApplicationModule } from '@domain/community/application/application.module';

@Module({
  imports: [
    AuthorizationModule,
    NotificationAdapterModule,
    CommunityModule,
    InvitationModule,
    InvitationExternalModule,
    UserModule,
    OrganizationModule,
    PreferenceSetModule,
    AuthorizationPolicyModule,
    ProfileModule,
    AgentModule,
    ApplicationModule,
    TypeOrmModule.forFeature([User]),
  ],
  providers: [RegistrationService, RegistrationResolverMutations],
  exports: [RegistrationService, RegistrationResolverMutations],
})
export class RegistrationModule {}
