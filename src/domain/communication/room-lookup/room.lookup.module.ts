import { Module } from '@nestjs/common';
import { RoomLookupService } from './room.lookup.service';
import { Room } from '../room/room.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';

@Module({
  imports: [CommunicationAdapterModule, TypeOrmModule.forFeature([Room])],
  providers: [RoomLookupService],
  exports: [RoomLookupService],
})
export class RoomLookupModule {}
