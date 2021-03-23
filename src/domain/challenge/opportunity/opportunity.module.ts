import { ActorGroupModule } from '@domain/context/actor-group/actor-group.module';
import { AspectModule } from '@domain/context/aspect/aspect.module';
import { ContextModule } from '@domain/context/context/context.module';
import { ProjectModule } from '@domain/collaboration/project/project.module';
import { RelationModule } from '@domain/collaboration/relation/relation.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity } from './opportunity.entity';
import { OpportunityResolverMutations } from './opportunity.resolver.mutations';
import { OpportunityResolverFields } from './opportunity.resolver.fields';
import { OpportunityService } from './opportunity.service';
import { CommunityModule } from '@domain/community/community/community.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';

@Module({
  imports: [
    ActorGroupModule,
    AspectModule,
    ProjectModule,
    ContextModule,
    CommunityModule,
    RelationModule,
    TagsetModule,
    TypeOrmModule.forFeature([Opportunity]),
  ],
  providers: [
    OpportunityService,
    OpportunityResolverMutations,
    OpportunityResolverFields,
  ],
  exports: [OpportunityService],
})
export class OpportunityModule {}
