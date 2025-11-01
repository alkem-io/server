import { RoomType } from '@common/enums/room.type';

export class CreateRoomInput {
  displayName!: string;

  type!: RoomType;

  senderID?: string;

  // Needed for direct messaging rooms
  receiverID?: string;
}
