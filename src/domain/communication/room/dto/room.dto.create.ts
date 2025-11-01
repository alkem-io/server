import { RoomType } from '@common/enums/room.type';

export class CreateRoomInput {
  displayName!: string;

  type!: RoomType;

  // Needed for direct messaging rooms
  senderID?: string;

  receiverID?: string;
}
