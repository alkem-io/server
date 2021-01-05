import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpportunityService } from './opportunity.service';
import { Opportunity } from './opportunity.entity';
import { OpportunityResolver } from './opportunity.resolver';
import { AspectModule } from '@domain/aspect/aspect.module';
import { ActorGroupModule } from '@domain/actor-group/actor-group.module';
import { RelationModule } from '@domain/relation/relation.module';
import { UserGroupModule } from '@domain/user-group/user-group.module';
import { UserModule } from '@domain/user/user.module';
import { OpportunityResolverFields } from './opportunity.resolver.fields';
import { ProjectModule } from '@domain/project/project.module';
import { ContextModule } from '@domain/context/context.module';
import { ProfileModule } from '@domain/profile/profile.module';

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
