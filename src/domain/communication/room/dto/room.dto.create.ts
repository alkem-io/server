import { JoinRule } from '@alkemio/matrix-adapter-lib';
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

  // Parent Matrix space context ID for anchoring this room in the hierarchy
  parentContextId?: string;

  // Matrix join rule for this room (e.g., JoinRulePublic for forum rooms)
  joinRule?: JoinRule;

  // Whether the room should be visible in the Matrix room directory
  isPublic?: boolean;
}
