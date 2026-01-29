import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { TagsetTemplateSetModule } from '@domain/common/tagset-template-set/tagset.template.set.module';
import { WhiteboardModule } from '@domain/common/whiteboard/whiteboard.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter/contribution.reporter.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { TemporaryStorageModule } from '@services/infrastructure/temporary-storage/temporary.storage.module';
import { CalloutModule } from '../callout/callout.module';
import { PostModule } from '../post/post.module';
import { CalloutsSet } from './callouts.set.entity';
import { CalloutsSetResolverFields } from './callouts.set.resolver.fields';
import { CalloutsSetResolverMutations } from './callouts.set.resolver.mutations';
import { CalloutsSetService } from './callouts.set.service';
import { CalloutsSetAuthorizationService } from './callouts.set.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    CalloutModule,
    TemporaryStorageModule,
    TagsetTemplateSetModule,
    StorageAggregatorResolverModule,
    ContributionReporterModule,
    ActivityAdapterModule,
    NotificationAdapterModule,
    NamingModule,
    EntityResolverModule,
    WhiteboardModule,
    PostModule,
    TypeOrmModule.forFeature([CalloutsSet]),
  ],
  providers: [
    CalloutsSetService,
    CalloutsSetAuthorizationService,
    CalloutsSetResolverMutations,
    CalloutsSetResolverFields,
  ],
  exports: [
    CalloutsSetService,
    CalloutsSetAuthorizationService,
    CalloutsSetResolverMutations,
    CalloutsSetResolverFields,
  ],
})
export class CalloutsSetModule {}
