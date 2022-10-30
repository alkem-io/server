import { Module } from '@nestjs/common';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { RoomService } from './room.service';

@Module({
  imports: [EntityResolverModule, CommunicationAdapterModule],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
