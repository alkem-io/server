import { RoomType } from '@common/enums/room.type';

export class CreateRoomInput {
  displayName!: string;

  type!: RoomType;

  senderCommunicationID?: string;

  // Needed for direct messaging rooms
  receiverCommunicationID?: string;
}
