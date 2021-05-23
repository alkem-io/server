import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { ContextModule } from '@domain/context/context/context.module';
import { Module } from '@nestjs/common';
import { NamingModule } from '@src/services/naming/naming.module';
import { BaseChallengeService } from './base.challenge.service';

@Module({
  imports: [
    ContextModule,
    CommunityModule,
    LifecycleModule,
    TagsetModule,
    NamingModule,
  ],
  providers: [BaseChallengeService],
  exports: [BaseChallengeService],
})
export class BaseChallengeModule {}
