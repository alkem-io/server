import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { ContextModule } from '@domain/context/context/context.module';
import { Module } from '@nestjs/common';
import { BaseChallengeLifecycleOptionsProvider } from './base.challenge.lifecycle.options.provider';
import { BaseChallengeService } from './base.challenge.service';

@Module({
  imports: [ContextModule, CommunityModule, LifecycleModule, TagsetModule],
  providers: [BaseChallengeService, BaseChallengeLifecycleOptionsProvider],
  exports: [BaseChallengeService, BaseChallengeLifecycleOptionsProvider],
})
export class BaseChallengeModule {}
