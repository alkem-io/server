import { ContextModule } from '@domain/context/context/context.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './challenge.entity';
import { ChallengeResolverFields } from './challenge.resolver.fields';
import { ChallengeResolverMutations } from './challenge.resolver.mutations';
import { ChallengeService } from './challenge.service';
import { CommunityModule } from '@domain/community/community/community.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { OpportunityModule } from '@domain/challenge/opportunity/opportunity.module';
import { BaseChallengeModule } from '@domain/challenge/base-challenge/base.challenge.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { ChallengeAuthorizationService } from '@domain/challenge/challenge/challenge.service.authorization';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { ProjectModule } from '@domain/collaboration/project/project.module';
import { UserModule } from '@domain/community/user/user.module';
import { PreferenceModule } from '@domain/common/preference';
import { PreferenceSetModule } from '@domain/common/preference-set/preference.set.module';
import { ChallengeResolverSubscriptions } from './challenge.resolver.subscriptions';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { CommunityPolicyModule } from '@domain/community/community-policy/community.policy.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { LoaderCreatorModule } from '@core/dataloader/creators';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { LicenseResolverModule } from '@services/infrastructure/license-resolver/license.resolver.module';

@Module({
  imports: [
    EntityResolverModule,
    ActivityAdapterModule,
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    ContextModule,
    BaseChallengeModule,
    CommunityModule,
    CommunityPolicyModule,
    OpportunityModule,
    OrganizationModule,
    NamingModule,
    PlatformAuthorizationPolicyModule,
    ProjectModule,
    UserModule,
    PreferenceModule,
    PreferenceSetModule,
    ContributionReporterModule,
    TypeOrmModule.forFeature([Challenge]),
    LoaderCreatorModule,
    StorageAggregatorModule,
    ContextModule,
    ProfileModule,
    CollaborationModule,
    LicenseResolverModule,
  ],
  providers: [
    ChallengeService,
    ChallengeAuthorizationService,
    ChallengeResolverMutations,
    ChallengeResolverFields,
    ChallengeResolverSubscriptions,
  ],
  exports: [ChallengeService, ChallengeAuthorizationService],
})
export class ChallengeModule {}
