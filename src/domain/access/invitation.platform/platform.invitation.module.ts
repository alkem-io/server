import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingRedisModule } from '@services/infrastructure/redis-client/messaging-redis.module';
import { PlatformInvitation } from './platform.invitation.entity';
import { PlatformInvitationResendThrottleService } from './platform.invitation.resend.throttle.service';
import { PlatformInvitationResolverFields } from './platform.invitation.resolver.fields';
import { PlatformInvitationResolverMutations } from './platform.invitation.resolver.mutations';
import { PlatformInvitationService } from './platform.invitation.service';
import { PlatformInvitationAuthorizationService } from './platform.invitation.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    UserLookupModule,
    MessagingRedisModule,
    TypeOrmModule.forFeature([PlatformInvitation]),
  ],
  providers: [
    PlatformInvitationService,
    PlatformInvitationResendThrottleService,
    PlatformInvitationAuthorizationService,
    PlatformInvitationResolverFields,
    PlatformInvitationResolverMutations,
  ],
  exports: [
    PlatformInvitationService,
    PlatformInvitationResendThrottleService,
    PlatformInvitationAuthorizationService,
    PlatformInvitationResolverMutations,
  ],
})
export class PlatformInvitationModule {}
