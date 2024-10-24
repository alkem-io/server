import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { CollaborationResolverMutations } from '@domain/collaboration/collaboration/collaboration.resolver.mutations';
import { CollaborationResolverFields } from '@domain/collaboration/collaboration/collaboration.resolver.fields';
import { CollaborationAuthorizationService } from './collaboration.service.authorization';
import { WhiteboardModule } from '@domain/common/whiteboard/whiteboard.module';
import { PostModule } from '../post/post.module';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { TagsetTemplateSetModule } from '@domain/common/tagset-template-set/tagset.template.set.module';
import { TimelineModule } from '@domain/timeline/timeline/timeline.module';
import { StorageAggregatorResolverModule } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.module';
import { InnovationFlowModule } from '../innovation-flow/innovation.flow.module';
import { SpaceDefaultsModule } from '@domain/space/space.defaults/space.defaults.module';
import { CalloutGroupsModule } from '../callout-groups/callout.group.module';
import { LicenseEngineModule } from '@core/license-engine/license.engine.module';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { TemporaryStorageModule } from '@services/infrastructure/temporary-storage/temporary.storage.module';

@Module({
  imports: [
    ContributionReporterModule,
    ActivityAdapterModule,
    NotificationAdapterModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    CalloutModule,
    RoleSetModule,
    NamingModule,
    EntityResolverModule,
    StorageAggregatorResolverModule,
    WhiteboardModule,
    PostModule,
    TimelineModule,
    TagsetTemplateSetModule,
    InnovationFlowModule,
    SpaceDefaultsModule,
    CalloutGroupsModule,
    LicenseEngineModule,
    TemporaryStorageModule,
    TypeOrmModule.forFeature([Collaboration]),
  ],
  providers: [
    CollaborationService,
    CollaborationAuthorizationService,
    CollaborationResolverMutations,
    CollaborationResolverFields,
  ],
  exports: [CollaborationService, CollaborationAuthorizationService],
})
export class CollaborationModule {}
