import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpportunityService } from './opportunity.service';
import { Opportunity } from './opportunity.entity';
import { OpportunityResolver } from './opportunity.resolver';
import { AspectModule } from '../aspect/aspect.module';
import { ActorGroupModule } from '../actor-group/actor-group.module';
import { RelationModule } from '../relation/relation.module';
import { UserGroupModule } from '../user-group/user-group.module';
import { UserModule } from '../user/user.module';
import { OpportunityResolverFields } from './opportunity.resolver.fields';
import { ProjectModule } from '../project/project.module';
import { ContextModule } from '../context/context.module';

@Module({
  imports: [
    ActorGroupModule,
    AspectModule,
    ProfileModule,
    ProjectModule,
    ContextModule,
    RelationModule,
    UserModule,
    UserGroupModule,
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
