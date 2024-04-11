import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Space } from '@domain/challenge/space/space.entity';
import { SpaceResolverMutations } from '@domain/challenge/space/space.resolver.mutations';
import { SpaceResolverQueries } from '@domain/challenge/space/space.resolver.queries';
import { SpaceService } from '@domain/challenge/space/space.service';
import { SpaceResolverFields } from '@domain/challenge/space/space.resolver.fields';
import { BaseChallengeModule } from '@domain/challenge/base-challenge/base.challenge.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SpaceAuthorizationService } from '@domain/challenge/space/space.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { SpaceFilterModule } from '@services/infrastructure/space-filter/space.filter.module';
import { SpaceResolverSubscriptions } from './space.resolver.subscriptions';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { LoaderCreatorModule } from '@core/dataloader/creators';
import { NameReporterModule } from '@services/external/elasticsearch/name-reporter/name.reporter.module';

@Module({
  imports: [
    ActivityAdapterModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    ChallengeModule,
    BaseChallengeModule,
    SpaceFilterModule,
    ContributionReporterModule,
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
