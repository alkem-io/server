import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { Room } from '../room/room.entity';
import { RoomLookupService } from './room.lookup.service';

// Module created to be able to avoid a circular dependency, but the proper solution is
// a bigger refactoring...
@Module({
  imports: [CommunicationAdapterModule, TypeOrmModule.forFeature([Room])], // Important this is nearly empty!
  providers: [RoomLookupService],
  exports: [RoomLookupService],
})
export class RoomLookupModule {}
