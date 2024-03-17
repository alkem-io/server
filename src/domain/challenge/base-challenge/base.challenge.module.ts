import { AgentModule } from '@domain/agent/agent/agent.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { ContextModule } from '@domain/context/context/context.module';
import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { BaseChallengeService } from './base.challenge.service';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { CommunityPolicyModule } from '@domain/community/community-policy/community.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { SpaceDefaultsModule } from '../space.defaults/space.defaults.module';
import { SpaceSettingssModule } from '../space.settings/space.settings.module';

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    ContextModule,
    CommunityModule,
    CommunityPolicyModule,
    ProfileModule,
    NamingModule,
    SpaceDefaultsModule,
    SpaceSettingssModule,
    CollaborationModule,
  ],
  providers: [BaseChallengeService],
  exports: [BaseChallengeService],
})
export class BaseChallengeModule {}
