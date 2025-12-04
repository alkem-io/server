import { RoomType } from '@common/enums/room.type';

export class CreateRoomInput {
  displayName!: string;

  type!: RoomType;

  senderActorId?: string;

  // Needed for direct messaging rooms
  receiverActorId?: string;
}
