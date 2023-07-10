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
import { RelationModule } from '@domain/collaboration/relation/relation.module';
import { CollaborationAuthorizationService } from './collaboration.service.authorization';
import { WhiteboardModule } from '@domain/common/whiteboard/whiteboard.module';
import { PostModule } from '../post/post.module';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { CommunityPolicyModule } from '@domain/community/community-policy/community.policy.module';
import { CollaborationResolverQueries } from './collaboration.resolver.queries';
import { ElasticsearchModule } from '@services/external/elasticsearch';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { TagsetTemplateSetModule } from '@domain/common/tagset-template-set/tagset.template.set.module';

@Module({
  imports: [
    ElasticsearchModule,
    ActivityAdapterModule,
    NotificationAdapterModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    CalloutModule,
    CommunityPolicyModule,
    NamingModule,
    EntityResolverModule,
    RelationModule,
    WhiteboardModule,
    PostModule,
    TagsetTemplateSetModule,
    TypeOrmModule.forFeature([Collaboration]),
  ],
  providers: [
    CollaborationService,
    CollaborationAuthorizationService,
    CollaborationResolverMutations,
    CollaborationResolverQueries,
    CollaborationResolverFields,
  ],
  exports: [CollaborationService, CollaborationAuthorizationService],
})
export class CollaborationModule {}
