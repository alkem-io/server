import { ActorGroupModule } from '@domain/actor-group/actor-group.module';
import { AspectModule } from '@domain/aspect/aspect.module';
import { ContextModule } from '@domain/context/context.module';
import { ProfileModule } from '@domain/profile/profile.module';
import { ProjectModule } from '@domain/project/project.module';
import { RelationModule } from '@domain/relation/relation.module';
import { UserGroupModule } from '@domain/user-group/user-group.module';
import { UserModule } from '@domain/user/user.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity } from './opportunity.entity';
import { OpportunityResolver } from './opportunity.resolver';
import { OpportunityResolverFields } from './opportunity.resolver.fields';
import { OpportunityService } from './opportunity.service';
import { ApplicationFactoryModule } from '@domain/application/application.factory.module';

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
    ApplicationFactoryModule,
  ],
  providers: [
    OpportunityService,
    OpportunityResolver,
    OpportunityResolverFields,
  ],
  exports: [OpportunityService],
})
export class OpportunityModule {}
