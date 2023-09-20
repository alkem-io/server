import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { Invitation } from '@domain/community/invitation';
import { InvitationService } from '@domain/community/invitation/invitation.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '@domain/community/user/user.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { InvitationResolverFields } from './invitation.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { InvitationAuthorizationService } from './invitation.service.authorization';
import { InvitationResolverMutations } from './invitation.resolver.mutations';
import { AgentModule } from '@domain/agent/agent/agent.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    LifecycleModule,
    UserModule,
    AgentModule,
    TypeOrmModule.forFeature([Invitation]),
  ],
  providers: [
    InvitationService,
    InvitationAuthorizationService,
    InvitationResolverFields,
    InvitationResolverMutations,
  ],
  exports: [
    InvitationService,
    InvitationAuthorizationService,
    InvitationResolverMutations,
  ],
})
export class InvitationModule {}
