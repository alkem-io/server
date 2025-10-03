import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Callout } from './callout.entity';
import { CalloutResolverMutations } from './callout.resolver.mutations';
import { CalloutService } from './callout.service';
import { CalloutAuthorizationService } from './callout.service.authorization';
import { CalloutResolverFields } from './callout.resolver.fields';
import { CalloutResolverSubscriptions } from './callout.resolver.subscriptions';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { RoomModule } from '@domain/communication/room/room.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { CalloutFramingModule } from '../callout-framing/callout.framing.module';
import { CalloutContributionDefaultsModule } from '../callout-contribution-defaults/callout.contribution.defaults.module';
import { CalloutContributionModule } from '../callout-contribution/callout.contribution.module';
import { PostModule } from '../post/post.module';
import { TemporaryStorageModule } from '@services/infrastructure/temporary-storage/temporary.storage.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { ClassificationModule } from '@domain/common/classification/classification.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';

@Module({
  imports: [
    EntityResolverModule,
    ContributionReporterModule,
    ActivityAdapterModule,
    NotificationAdapterModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    RoomModule,
    EntityResolverModule,
    UserLookupModule,
    NamingModule,
    CalloutFramingModule,
    CalloutContributionModule,
    CalloutContributionDefaultsModule,
    StorageAggregatorResolverModule,
    PostModule,
    ClassificationModule,
    TemporaryStorageModule,
    RoleSetModule,
    TypeOrmModule.forFeature([Callout]),
  ],
  providers: [
    CalloutResolverMutations,
    CalloutService,
    CalloutAuthorizationService,
    CalloutResolverFields,
    CalloutResolverSubscriptions,
  ],
  exports: [CalloutService, CalloutAuthorizationService],
})
export class CalloutModule {}
