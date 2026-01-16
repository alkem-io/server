import { Module } from '@nestjs/common';
import { RoomLookupService } from './room.lookup.service';
import { Room } from '../room/room.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';

// Module created to be able to avoid a circular dependency, but the proper solution is
// a bigger refactoring...
@Module({
  imports: [CommunicationAdapterModule, TypeOrmModule.forFeature([Room])], // Important this is nearly empty!
  providers: [RoomLookupService],
  exports: [RoomLookupService],
})
export class RoomLookupModule {}
