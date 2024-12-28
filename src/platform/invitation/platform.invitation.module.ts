import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { PlatformInvitationResolverFields } from './platform.invitation.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformInvitationAuthorizationService } from './platform.invitation.service.authorization';
import { PlatformInvitationResolverMutations } from './platform.invitation.resolver.mutations';
import { PlatformInvitation } from './platform.invitation.entity';
import { PlatformInvitationService } from './platform.invitation.service';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';

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
