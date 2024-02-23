import {
  DISCONNECT,
  DISCONNECTING,
  ROOM_USER_CHANGE,
  SERVER_BROADCAST,
  SERVER_VOLATILE_BROADCAST,
} from '@services/external/excalidraw-backend/types/event.names';
import {
  BaseEvent,
  DisconnectedEvent,
  DisconnectingEvent,
  RoomUserChangeEvent,
  ServerBroadcastEvent,
  ServerVolatileBroadcastEvent,
} from '../events';
import {
  BasePayload,
  RoomUserChangePayload,
  ServerBroadcastPayload,
  ServerVolatileBroadcastPayload,
} from '../payloads';

export const excalidrawEventFactory = (
  payload: BasePayload
): BaseEvent | undefined => {
  switch (payload.name) {
    case DISCONNECT:
      return createDisconnectedEvent(payload);
    case DISCONNECTING:
      return createDisconnectingEvent(payload);
    case ROOM_USER_CHANGE:
      return createRoomUserChangeEvent(payload);
    case SERVER_BROADCAST:
      return createServerBroadcastEvent(payload);
    case SERVER_VOLATILE_BROADCAST:
      return createServerVolatileBroadcastEvent(payload);
    default:
      return undefined;
  }
};

const createDisconnectedEvent = (payload: BasePayload): DisconnectedEvent => {
  return new DisconnectedEvent(payload.publisherId);
};

const createDisconnectingEvent = (payload: BasePayload): DisconnectingEvent => {
  return new DisconnectingEvent(payload.publisherId);
};

const createRoomUserChangeEvent = (
  payload: BasePayload
): RoomUserChangeEvent => {
  const { roomID, publisherId, socketIDs } = payload as RoomUserChangePayload;
  return new RoomUserChangeEvent(roomID, socketIDs, publisherId);
};

const createServerBroadcastEvent = (
  payload: BasePayload
): ServerBroadcastEvent => {
  const { roomID, publisherId, data } = payload as ServerBroadcastPayload;
  return new ServerBroadcastEvent(roomID, data, publisherId);
};

const createServerVolatileBroadcastEvent = (
  payload: BasePayload
): ServerVolatileBroadcastEvent => {
  const { roomID, publisherId, data } =
    payload as ServerVolatileBroadcastPayload;
  return new ServerVolatileBroadcastEvent(roomID, data, publisherId);
};
