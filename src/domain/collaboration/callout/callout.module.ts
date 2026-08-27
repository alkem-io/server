import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CalloutMyReactionLoaderCreator } from '@core/dataloader/creators/loader.creators/callout/callout.my.reaction.loader.creator';
import { RoleSetModule } from '@domain/access/role-set/role.set.module';
import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ClassificationModule } from '@domain/common/classification/classification.module';
import { TagsetTemplateModule } from '@domain/common/tagset-template/tagset.template.module';
import { WhiteboardModule } from '@domain/common/whiteboard/whiteboard.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { CollaboraDocumentModule } from '../collabora-document/collabora.document.module';
import { CollaborationLicenseModule } from '../collaboration/collaboration.license.module';
import { PostModule } from '../post/post.module';
import { ReactionModule } from '../reaction/reaction.module';
import { CalloutContributionDefaultSourceService } from './callout.contribution.default.source.service';
import { Callout } from './callout.entity';
import { CalloutResolverFields } from './callout.resolver.fields';
import { CalloutResolverMutations } from './callout.resolver.mutations';
import { CalloutResolverSubscriptions } from './callout.resolver.subscriptions';
import { CalloutService } from './callout.service';
import { CalloutAuthorizationService } from './callout.service.authorization';
import { TaskBoardColumnService } from './task-board/task.board.column.service';
import { TaskBoardModule } from './task-board/task.board.module';
import { TaskBoardMoveService } from './task-board/task.board.move.service';
import { TaskBoardResolverMutations } from './task-board/task.board.resolver.mutations';

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
    WhiteboardModule,
    CalloutFramingModule,
    CalloutContributionModule,
    CalloutContributionDefaultsModule,
    CollaboraDocumentModule,
    CollaborationLicenseModule,
    StorageAggregatorResolverModule,
    PostModule,
    ClassificationModule,
    TemporaryStorageModule,
    RoleSetModule,
    ReactionModule,
    ActorLookupModule,
    TaskBoardModule,
    TagsetTemplateModule,
    TypeOrmModule.forFeature([Callout]),
  ],
  providers: [
    CalloutResolverMutations,
    CalloutContributionDefaultSourceService,
    CalloutService,
    CalloutAuthorizationService,
    CalloutResolverFields,
    CalloutResolverSubscriptions,
    CalloutMyReactionLoaderCreator,
    TaskBoardMoveService,
    TaskBoardColumnService,
    TaskBoardResolverMutations,
  ],
  exports: [
    CalloutService,
    CalloutContributionDefaultSourceService,
    CalloutAuthorizationService,
    CalloutResolverMutations,
  ],
})
export class CalloutModule {}
