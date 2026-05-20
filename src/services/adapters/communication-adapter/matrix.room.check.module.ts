import { MessagingModule } from '@domain/communication/messaging/messaging.module';
import { Module } from '@nestjs/common';
import { MatrixRoomCheckController } from './matrix.room.check.controller';

/**
 * Hosts the RabbitMQ RPC handlers for the Element room-check flow (feature
 * 099-element-room-check) — `communication.room.check` and
 * `communication.room.info`.
 *
 * Lives in its own module to keep `CommunicationAdapterModule` free of a
 * `MessagingModule` dependency (which would create a cycle through
 * `RoomService` → `CommunicationAdapter`). The Matrix-adapter outbound side
 * stays in `CommunicationAdapterModule`; this module owns the inbound RPC
 * surface that the room-check flow introduced.
 *
 * Registered in `AppModule`.
 */
@Module({
  imports: [MessagingModule],
  providers: [MatrixRoomCheckController],
})
export class MatrixRoomCheckModule {}
