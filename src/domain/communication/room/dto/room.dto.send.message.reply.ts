import { RoomSendMessageInput } from './room.dto.send.message';

export class RoomSendMessageReplyInput extends RoomSendMessageInput {
  threadID!: string;
  lastMessageID!: string;
}
