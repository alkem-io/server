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
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { OpportunityAuthorizationService } from './opportunity.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { UserModule } from '@domain/community/user/user.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { CommunityPolicyModule } from '@domain/community/community-policy/community.policy.module';
import { ElasticsearchModule } from '@services/external/elasticsearch';
import { InnovationFlowTemplateModule } from '@domain/template/innovation-flow-template/innovation.flow.template.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ProjectModule,
    RelationModule,
    BaseChallengeModule,
    CommunityModule,
    LifecycleModule,
    InnovationFlowTemplateModule,
    UserModule,
    AgentModule,
    CommunityPolicyModule,
    NamingModule,
    ElasticsearchModule,
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
