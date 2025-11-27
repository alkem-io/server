import { RoomType } from '@common/enums/room.type';

export class CreateRoomInput {
  displayName!: string;

  type!: RoomType;

  senderAgentID?: string;

  // Needed for direct messaging rooms
  receiverAgentID?: string;
}
