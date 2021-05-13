import { ContextModule } from '@domain/context/context/context.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './challenge.entity';
import { ChallengeResolverFields } from './challenge.resolver.fields';
import { ChallengeResolverMutations } from './challenge.resolver.mutations';
import { ChallengeService } from './challenge.service';
import { CommunityModule } from '@domain/community/community/community.module';
import { OrganisationModule } from '@domain/community/organisation/organisation.module';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { ChallengeLifecycleOptionsProvider } from './challenge.lifecycle.options.provider';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';

@Module({
  imports: [
    ContextModule,
    CommunityModule,
    CollaborationModule,
    TagsetModule,
    OrganisationModule,
    LifecycleModule,
    TypeOrmModule.forFeature([Challenge]),
  ],
  providers: [
    ChallengeService,
    ChallengeResolverMutations,
    ChallengeResolverFields,
    ChallengeLifecycleOptionsProvider,
  ],
  exports: [ChallengeService],
})
export class ChallengeModule {}
