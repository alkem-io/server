import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpportunityService } from './opportunity.service';
import { Opportunity } from './opportunity.entity';
import { OpportunityResolver } from './opportunity.resolver';
import { ProfileModule } from '../profile/profile.module';
import { ActorGroupModule } from '../actor-group/actor-group.module';

@Module({
  imports: [
    ActorGroupModule,
    ProfileModule,
    TypeOrmModule.forFeature([Opportunity]),
  ],
  providers: [OpportunityService, OpportunityResolver],
  exports: [OpportunityService],
})
export class OpportunityModule {}
