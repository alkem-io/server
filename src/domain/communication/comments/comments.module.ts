import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NamingModule } from '@services/domain/naming/naming.module';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { RoomModule } from '../room/room.module';
import { Comments } from './comments.entity';
import { CommentsResolverFields } from './comments.resolver.fields';
import { CommentsResolverMutations } from './comments.resolver.mutations';
import { CommentsService } from './comments.service';
import { CommentsAuthorizationService } from './comments.service.authorization';

@Module({
  imports: [
    ActivityAdapterModule,
    NotificationAdapterModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    NamingModule,
    RoomModule,
    CommunicationAdapterModule,
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
