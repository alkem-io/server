import { AgentModule } from '@domain/agent/agent/agent.module';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { ContextModule } from '@domain/context/context/context.module';
import { Module } from '@nestjs/common';
import { AuthorizationEngineModule } from '@src/services/authorization-engine/authorization-engine.module';
import { NamingModule } from '@src/services/naming/naming.module';
import { BaseChallengeService } from './base.challenge.service';
import { BaseChallengeAuthorizationService } from './base.challenge.service.authorization';

@Module({
  imports: [
    AgentModule,
    AuthorizationEngineModule,
    ContextModule,
    CommunityModule,
    CredentialModule,
    LifecycleModule,
    TagsetModule,
    NamingModule,
  ],
  providers: [BaseChallengeService, BaseChallengeAuthorizationService],
  exports: [BaseChallengeService, BaseChallengeAuthorizationService],
})
export class BaseChallengeModule {}
