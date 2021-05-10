import { ActorGroupModule } from '@domain/context/actor-group/actor-group.module';
import { AspectModule } from '@domain/context/aspect/aspect.module';
import { ContextModule } from '@domain/context/context/context.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity } from './opportunity.entity';
import { OpportunityResolverMutations } from './opportunity.resolver.mutations';
import { OpportunityResolverFields } from './opportunity.resolver.fields';
import { OpportunityService } from './opportunity.service';
import { CommunityModule } from '@domain/community/community/community.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { OpportunityLifecycleOptionsProvider } from './opportunity.lifecycle.options.provider';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';

@Module({
  imports: [
    ActorGroupModule,
    AspectModule,
    ContextModule,
    CommunityModule,
    CollaborationModule,
    LifecycleModule,
    TagsetModule,
    TypeOrmModule.forFeature([Opportunity]),
  ],
  providers: [
    OpportunityService,
    OpportunityResolverMutations,
    OpportunityResolverFields,
    OpportunityLifecycleOptionsProvider,
  ],
  exports: [OpportunityService],
})
export class OpportunityModule {}
