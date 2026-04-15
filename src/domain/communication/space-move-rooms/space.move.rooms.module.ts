import { CommunicationModule } from '@domain/communication/communication/communication.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { Module } from '@nestjs/common';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { SpaceMoveRoomsService } from './space.move.rooms.service';

@Module({
  imports: [
    SpaceLookupModule,
    CommunicationAdapterModule,
    RoomModule,
    CommunicationModule,
  ],
  providers: [SpaceMoveRoomsService],
  exports: [SpaceMoveRoomsService],
})
export class SpaceMoveRoomsModule {}
