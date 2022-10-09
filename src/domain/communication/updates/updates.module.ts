import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { RoomModule } from '../room/room.module';
import { Updates } from './updates.entity';
import { UpdatesResolverFields } from './updates.resolver.fields';
import { UpdatesResolverMutations } from './updates.resolver.mutations';
import { UpdatesResolverSubscriptions } from './updates.resolver.subscriptions';
import { UpdatesService } from './updates.service';

@Module({
  imports: [
    AuthorizationModule,
    NotificationAdapterModule,
    RoomModule,
    CommunicationAdapterModule,
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
