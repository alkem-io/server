import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity } from '@domain/collaboration/opportunity';
import { OpportunityService } from './opportunity.service';
import { ProjectModule } from '@domain/collaboration/project/project.module';
import { RelationModule } from '@domain/collaboration/relation/relation.module';
import { OpportunityResolverFields } from './opportunity.resolver.fields';
import { OpportunityResolverMutations } from './opportunity.resolver.mutations';
import { BaseChallengeModule } from '@domain/challenge/base-challenge/base.challenge.module';
import { OpportunityLifecycleOptionsProvider } from './opportunity.lifecycle.options.provider';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { OpportunityAuthorizationService } from './opportunity.service.authorization';
import { AuthorizationDefinitionModule } from '@domain/common/authorization-definition/authorization.definition.module';

@Module({
  imports: [
    AuthorizationEngineModule,
    AuthorizationDefinitionModule,
    ProjectModule,
    RelationModule,
    BaseChallengeModule,
    CommunityModule,
    LifecycleModule,
    TypeOrmModule.forFeature([Opportunity]),
  ],
  providers: [
    OpportunityService,
    OpportunityResolverFields,
    OpportunityResolverMutations,
    OpportunityLifecycleOptionsProvider,
    OpportunityAuthorizationService,
  ],
  exports: [OpportunityService, OpportunityAuthorizationService],
})
export class OpportunityModule {}
