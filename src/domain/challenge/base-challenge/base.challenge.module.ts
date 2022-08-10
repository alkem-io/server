import { AgentModule } from '@domain/agent/agent/agent.module';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { ContextModule } from '@domain/context/context/context.module';
import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { NamingModule } from '@src/services/domain/naming/naming.module';
import { BaseChallengeService } from './base.challenge.service';
import { BaseChallengeAuthorizationService } from './base.challenge.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { AspectModule } from '@domain/collaboration/aspect/aspect.module';
import { CanvasModule } from '@domain/common/canvas/canvas.module';

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    ContextModule,
    CommunityModule,
    LifecycleModule,
    TagsetModule,
    NamingModule,
    CollaborationModule,
    AspectModule,
    CanvasModule,
  ],
  providers: [BaseChallengeService, BaseChallengeAuthorizationService],
  exports: [BaseChallengeService, BaseChallengeAuthorizationService],
})
export class BaseChallengeModule {}
