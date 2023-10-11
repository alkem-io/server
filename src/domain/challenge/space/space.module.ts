import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { ContextModule } from '@domain/context/context/context.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Space } from '@domain/challenge/space/space.entity';
import { SpaceResolverMutations } from '@domain/challenge/space/space.resolver.mutations';
import { SpaceResolverQueries } from '@domain/challenge/space/space.resolver.queries';
import { SpaceService } from '@domain/challenge/space/space.service';
import { SpaceResolverFields } from '@domain/challenge/space/space.resolver.fields';
import { CommunityModule } from '@domain/community/community/community.module';
import { ProjectModule } from '@domain/collaboration/project/project.module';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { OpportunityModule } from '@domain/collaboration/opportunity/opportunity.module';
import { BaseChallengeModule } from '@domain/challenge/base-challenge/base.challenge.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SpaceAuthorizationService } from '@domain/challenge/space/space.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { UserModule } from '@domain/community/user/user.module';
import { PreferenceModule } from '@domain/common/preference';
import { PreferenceSetModule } from '@domain/common/preference-set/preference.set.module';
import { TemplatesSetModule } from '@domain/template/templates-set/templates.set.module';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { SpaceFilterModule } from '@services/infrastructure/space-filter/space.filter.module';
import { SpaceResolverSubscriptions } from './space.resolver.subscriptions';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { CommunityPolicyModule } from '@domain/community/community-policy/community.policy.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { LoaderCreatorModule } from '@core/dataloader/creators';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { SpaceStorageBucketLoaderCreator } from '@core/dataloader/creators/loader.creators/space/space.storage.space.loader.creator';
import { NameReporterModule } from '@services/external/elasticsearch/name-reporter/name.reporter.module';
import { ProfileModule } from '@domain/common/profile/profile.module';

@Module({
  imports: [
    ActivityAdapterModule,
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    ContextModule,
    CommunityModule,
    CommunityPolicyModule,
    ChallengeModule,
    BaseChallengeModule,
    OpportunityModule,
    PlatformAuthorizationPolicyModule,
    ProjectModule,
    OrganizationModule,
    StorageBucketModule,
    UserGroupModule,
    UserModule,
    NamingModule,
    PreferenceModule,
    PreferenceSetModule,
    TemplatesSetModule,
    CollaborationModule,
    SpaceFilterModule,
    ContributionReporterModule,
    LoaderCreatorModule,
    NameReporterModule,
    ProfileModule,
    TypeOrmModule.forFeature([Space]),
  ],
  providers: [
    SpaceService,
    SpaceAuthorizationService,
    SpaceResolverFields,
    SpaceResolverQueries,
    SpaceResolverMutations,
    SpaceResolverSubscriptions,
    SpaceStorageBucketLoaderCreator,
  ],
  exports: [SpaceService, SpaceAuthorizationService],
})
export class SpaceModule {}
