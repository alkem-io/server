import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { ElasticsearchModule } from '@services/external/elasticsearch';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { RoomModule } from '../room/room.module';
import { Comments } from './comments.entity';
import { CommentsResolverFields } from './comments.resolver.fields';
import { CommentsResolverMutations } from './comments.resolver.mutations';
import { CommentsService } from './comments.service';
import { CommentsAuthorizationService } from './comments.service.authorization';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [
    EntityResolverModule,
    ElasticsearchModule,
    ActivityAdapterModule,
    NotificationAdapterModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    NamingModule,
    RoomModule,
    CommunicationAdapterModule,
    MessagingModule,
    TypeOrmModule.forFeature([Comments]),
  ],
  providers: [
    CommentsService,
    CommentsAuthorizationService,
    CommentsResolverFields,
    CommentsResolverMutations,
  ],
  exports: [CommentsService, CommentsAuthorizationService],
})
export class CommentsModule {}
