import { RoomType } from '@common/enums/room.type';

export class CreateRoomInput {
  displayName!: string;

  type!: RoomType;

  senderActorID?: string;

  // Needed for direct messaging rooms
  receiverActorID?: string;
}
