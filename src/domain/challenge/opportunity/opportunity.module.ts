import { ActorGroupModule } from '@domain/context/actor-group/actor-group.module';
import { AspectModule } from '@domain/context/aspect/aspect.module';
import { ContextModule } from '@domain/context/context/context.module';
import { ProjectModule } from '@domain/collaboration/project/project.module';
import { RelationModule } from '@domain/collaboration/relation/relation.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity } from './opportunity.entity';
import { OpportunityResolver } from './opportunity.resolver';
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
    OpportunityResolver,
    OpportunityResolverFields,
  ],
  exports: [OpportunityService],
})
export class OpportunityModule {}
