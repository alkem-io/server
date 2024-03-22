import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { ContextModule } from '@domain/context/context/context.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Space } from '@domain/challenge/space/space.entity';
import { SpaceResolverMutations } from '@domain/challenge/space/space.resolver.mutations';
import { SpaceResolverQueries } from '@domain/challenge/space/space.resolver.queries';
import { SpaceService } from '@domain/challenge/space/space.service';
import { SpaceResolverFields } from '@domain/challenge/space/space.resolver.fields';
import { CommunityModule } from '@domain/community/community/community.module';
import { BaseChallengeModule } from '@domain/challenge/base-challenge/base.challenge.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SpaceAuthorizationService } from '@domain/challenge/space/space.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { UserModule } from '@domain/community/user/user.module';
import { SpaceFilterModule } from '@services/infrastructure/space-filter/space.filter.module';
import { SpaceResolverSubscriptions } from './space.resolver.subscriptions';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { CommunityPolicyModule } from '@domain/community/community-policy/community.policy.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { LoaderCreatorModule } from '@core/dataloader/creators';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { SpaceSettingssModule } from '../space.settings/space.settings.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { NameReporterModule } from '@services/external/elasticsearch/name-reporter/name.reporter.module';

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
    UserModule,
    NamingModule,
    CollaborationModule,
    SpaceFilterModule,
    SpaceSettingssModule,
    ContributionReporterModule,
    LoaderCreatorModule,
    StorageAggregatorModule,
    ProfileModule,
    NameReporterModule,
    TypeOrmModule.forFeature([Space]),
  ],
  providers: [
    SpaceService,
    SpaceAuthorizationService,
    SpaceResolverFields,
    SpaceResolverQueries,
    SpaceResolverMutations,
    SpaceResolverSubscriptions,
  ],
  exports: [SpaceService, SpaceAuthorizationService],
})
export class SpaceModule {}
