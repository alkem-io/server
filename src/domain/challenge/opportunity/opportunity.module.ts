import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity } from '@domain/challenge/opportunity';
import { OpportunityService } from './opportunity.service';
import { ProjectModule } from '@domain/collaboration/project/project.module';
import { RelationModule } from '@domain/collaboration/relation/relation.module';
import { OpportunityResolverFields } from './opportunity.resolver.fields';
import { OpportunityResolverMutations } from './opportunity.resolver.mutations';
import { BaseChallengeModule } from '@domain/challenge/base-challenge/base.challenge.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { OpportunityAuthorizationService } from './opportunity.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { UserModule } from '@domain/community/user/user.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { CommunityPolicyModule } from '@domain/community/community-policy/community.policy.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { ContextModule } from '@domain/context/context/context.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { LicenseResolverModule } from '@services/infrastructure/license-resolver/license.resolver.module';
import { SpaceDefaultsModule } from '../space.defaults/space.defaults.module';
import { SpaceSettingssModule } from '../space.settings/space.settings.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ProjectModule,
    RelationModule,
    BaseChallengeModule,
    CommunityModule,
    UserModule,
    AgentModule,
    CommunityPolicyModule,
    CollaborationModule,
    NamingModule,
    ProfileModule,
    ContextModule,
    ContributionReporterModule,
    SpaceDefaultsModule,
    SpaceSettingssModule,
    StorageAggregatorModule,
    LicenseResolverModule,
    TypeOrmModule.forFeature([Opportunity]),
  ],
  providers: [
    OpportunityService,
    OpportunityResolverFields,
    OpportunityResolverMutations,
    OpportunityAuthorizationService,
  ],
  exports: [OpportunityService, OpportunityAuthorizationService],
})
export class OpportunityModule {}
