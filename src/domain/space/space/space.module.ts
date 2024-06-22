import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Space } from '@domain/space/space/space.entity';
import { SpaceResolverMutations } from '@domain/space/space/space.resolver.mutations';
import { SpaceResolverQueries } from '@domain/space/space/space.resolver.queries';
import { SpaceService } from '@domain/space/space/space.service';
import { SpaceResolverFields } from '@domain/space/space/space.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SpaceAuthorizationService } from '@domain/space/space/space.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { SpaceFilterModule } from '@services/infrastructure/space-filter/space.filter.module';
import { SpaceResolverSubscriptions } from './space.resolver.subscriptions';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { LoaderCreatorModule } from '@core/dataloader/creators';
import { NameReporterModule } from '@services/external/elasticsearch/name-reporter/name.reporter.module';
import { ContextModule } from '@domain/context/context/context.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { CommunityPolicyModule } from '@domain/community/community-policy/community.policy.module';
import { CommunityModule } from '@domain/community/community/community.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { SpaceDefaultsModule } from '../space.defaults/space.defaults.module';
import { SpaceSettingssModule } from '../space.settings/space.settings.module';

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    ContextModule,
    CommunityModule,
    CommunityPolicyModule,
    ProfileModule,
    NamingModule,
    PlatformAuthorizationPolicyModule,
    SpaceDefaultsModule,
    SpaceSettingssModule,
    StorageAggregatorModule,
    ContributionReporterModule,
    CollaborationModule,
    SpaceFilterModule,
    ActivityAdapterModule,
    LoaderCreatorModule,
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
