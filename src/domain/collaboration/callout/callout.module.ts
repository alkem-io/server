import { AuthorizationModule } from '@core/authorization/authorization.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ClassificationModule } from '@domain/common/classification/classification.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { TemporaryStorageModule } from '@services/infrastructure/temporary-storage/temporary.storage.module';
import { CalloutContributionModule } from '../callout-contribution/callout.contribution.module';
import { CalloutContributionDefaultsModule } from '../callout-contribution-defaults/callout.contribution.defaults.module';
import { CalloutFramingModule } from '../callout-framing/callout.framing.module';
import { PostModule } from '../post/post.module';
import { CalloutResolverFields } from './callout.resolver.fields';
import { CalloutResolverMutations } from './callout.resolver.mutations';
import { CalloutResolverSubscriptions } from './callout.resolver.subscriptions';
import { CalloutService } from './callout.service';
import { CalloutAuthorizationService } from './callout.service.authorization';

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
