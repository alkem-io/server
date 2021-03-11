import { ContextModule } from '@domain/context/context/context.module';
import { OpportunityModule } from '@domain/challenge/opportunity/opportunity.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './challenge.entity';
import { ChallengeResolverFields } from './challenge.resolver.fields';
import { ChallengeResolverMutations } from './challenge.resolver.mutations';
import { ChallengeService } from './challenge.service';
import { CommunityModule } from '@domain/community/community/community.module';

@Module({
  imports: [
    ContextModule,
    CommunityModule,
    TagsetModule,
    OpportunityModule,
    TypeOrmModule.forFeature([Challenge]),
  ],
  providers: [
    ChallengeService,
    ChallengeResolverMutations,
    ChallengeResolverFields,
  ],
  exports: [ChallengeService],
})
export class ChallengeModule {}
