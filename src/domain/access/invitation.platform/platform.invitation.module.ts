import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformInvitation } from './platform.invitation.entity';
import { PlatformInvitationResolverFields } from './platform.invitation.resolver.fields';
import { PlatformInvitationResolverMutations } from './platform.invitation.resolver.mutations';
import { PlatformInvitationService } from './platform.invitation.service';
import { PlatformInvitationAuthorizationService } from './platform.invitation.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    UserLookupModule,
    TypeOrmModule.forFeature([PlatformInvitation]),
  ],
  providers: [
    PlatformInvitationService,
    PlatformInvitationAuthorizationService,
    PlatformInvitationResolverFields,
    PlatformInvitationResolverMutations,
  ],
  exports: [
    PlatformInvitationService,
    PlatformInvitationAuthorizationService,
    PlatformInvitationResolverMutations,
  ],
})
export class PlatformInvitationModule {}
