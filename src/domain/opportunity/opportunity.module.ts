import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpportunityService } from './opportunity.service';
import { Opportunity } from './opportunity.entity';
import { OpportunityResolver } from './opportunity.resolver';
import { ProfileModule } from '../profile/profile.module';
import { AspectModule } from '../aspect/aspect.module';
import { ActorGroupModule } from '../actor-group/actor-group.module';
import { RelationModule } from '../relation/relation.module';

@Module({
  imports: [
    ActorGroupModule,
    AspectModule,
    ProfileModule,
    RelationModule,
    TypeOrmModule.forFeature([Opportunity]),
  ],
  providers: [OpportunityService, OpportunityResolver],
  exports: [OpportunityService],
})
export class OpportunityModule {}
