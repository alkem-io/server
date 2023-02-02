import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { ElasticsearchModule } from '@services/external/elasticsearch';
import { RoomModule } from '../room/room.module';
import { Updates } from './updates.entity';
import { UpdatesResolverFields } from './updates.resolver.fields';
import { UpdatesResolverMutations } from './updates.resolver.mutations';
import { UpdatesResolverSubscriptions } from './updates.resolver.subscriptions';
import { UpdatesService } from './updates.service';

@Module({
  imports: [
    ElasticsearchModule,
    AuthorizationModule,
    NotificationAdapterModule,
    RoomModule,
    CommunicationAdapterModule,
    ActivityAdapterModule,
    TypeOrmModule.forFeature([Updates]),
  ],
  providers: [
    UpdatesService,
    UpdatesResolverFields,
    UpdatesResolverMutations,
    UpdatesResolverSubscriptions,
  ],
  exports: [UpdatesService],
})
export class UpdatesModule {}
