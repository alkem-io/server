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
import { OpportunityModule } from '@domain/collaboration/opportunity/opportunity.module';
import { BaseChallengeModule } from '../base-challenge/base.challenge.module';
import { ChallengeLifecycleOptionsProvider } from './challenge.lifecycle.options.provider';
import { NamingModule } from '@src/services/naming/naming.module';

@Module({
  imports: [
    ContextModule,
    BaseChallengeModule,
    CommunityModule,
    OpportunityModule,
    TagsetModule,
    OrganisationModule,
    NamingModule,
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
