import {
  DISCONNECT,
  DISCONNECTING,
  JOIN_ROOM,
  NEW_USER,
  ROOM_USER_CHANGE,
  SERVER_BROADCAST,
  SERVER_VOLATILE_BROADCAST,
} from '@services/external/excalidraw-backend/event.names';
// todo: clear payloads
export type BasePayload = {
  roomID: string;
  publisherId?: string;
  name?: string;
};
export type RoomJoinPayload = BasePayload & {
  name?: typeof JOIN_ROOM;
};
export type NewUserPayload = BasePayload & {
  name?: typeof NEW_USER;
  socketID: string; // socket of the new user
};
export type RoomUserChangePayload = BasePayload & {
  name?: typeof ROOM_USER_CHANGE;
  socketIDs: Array<string>; // all sockets in the room
};
export type ServerBroadcastPayload = BasePayload & {
  name?: typeof SERVER_BROADCAST;
  data: ArrayBuffer;
};
export type ServerVolatileBroadcastPayload = BasePayload & {
  name?: typeof SERVER_VOLATILE_BROADCAST;
  data: ArrayBuffer;
};
export type DisconnectingPayload = BasePayload & {
  name?: typeof DISCONNECTING;
};
export type DisconnectedPayload = BasePayload & {
  name?: typeof DISCONNECT;
};
