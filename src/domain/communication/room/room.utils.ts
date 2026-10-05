import { RoomType } from '@common/enums/room.type';
import { IRoom } from './room.interface';

/**
 * Whether a room is a conversation (direct-messaging) room — one of the three
 * conversation room types. Shared by the inbound event handler and the message
 * attachment service so the room-type predicate is defined once (feature 013).
 */
export function isConversationRoom(room: IRoom): boolean {
  return (
    room.type === RoomType.CONVERSATION ||
    room.type === RoomType.CONVERSATION_DIRECT ||
    room.type === RoomType.CONVERSATION_GROUP
  );
}
