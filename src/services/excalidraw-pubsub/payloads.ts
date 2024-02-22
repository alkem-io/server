import {
  DISCONNECT,
  DISCONNECTING,
  IDLE_STATE,
  ROOM_USER_CHANGE,
  SERVER_BROADCAST,
  SERVER_VOLATILE_BROADCAST,
} from '@services/external/excalidraw-backend/types/event.names';

export type BasePayload = {
  roomID: string;
  publisherId?: string;
  name?: string;
  data?: ArrayBuffer;
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
export type IdleStatePayload = BasePayload & {
  name?: typeof IDLE_STATE;
  data: ArrayBuffer;
};
export type DisconnectingPayload = BasePayload & {
  name?: typeof DISCONNECTING;
};
export type DisconnectedPayload = BasePayload & {
  name?: typeof DISCONNECT;
};
