import { RoomType } from '@common/enums/room.type';

export class CreateRoomInput {
  displayName!: string;

  type!: RoomType;

  senderActorID?: string;

  // Needed for direct messaging rooms
  receiverActorID?: string;

  // Needed for group messaging rooms — all member actor IDs (including creator)
  memberActorIDs?: string[];

  // Optional avatar URL for the room (mxc:// or https://)
  avatarUrl?: string;
}
