import { RemoteSocket, Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { SocketData } from './socket.data';
import {
  CLIENT_BROADCAST,
  CONNECTION_CLOSED,
  DISCONNECT,
  DISCONNECTING,
  IDLE_STATE,
  SCENE_INIT,
  JOIN_ROOM,
  NEW_USER,
  ROOM_USER_CHANGE,
  SERVER_BROADCAST,
  SERVER_VOLATILE_BROADCAST,
} from './event.names';

type ListenEvents = {
  [JOIN_ROOM]: (roomId: string) => void;
  [SCENE_INIT]: (roomId: string, data: ArrayBuffer) => void;
  [SERVER_BROADCAST]: (roomId: string, data: ArrayBuffer) => void;
  [SERVER_VOLATILE_BROADCAST]: (roomId: string, data: ArrayBuffer) => void;
  [IDLE_STATE]: (roomId: string, data: ArrayBuffer) => void;
  [DISCONNECTING]: () => void;
  [DISCONNECT]: () => void;
  error: (err: Error) => void;
};
type EmitEvents = {
  [CLIENT_BROADCAST]: (data: ArrayBuffer) => void;
  [NEW_USER]: (socketId: string) => void;
  [IDLE_STATE]: (data: ArrayBuffer) => void;
  [ROOM_USER_CHANGE]: (socketIds: Array<string>) => void;
  [CONNECTION_CLOSED]: (message?: string) => void;
};
type ServerSideEvents = DefaultEventsMap;

export type SocketIoSocket = Socket<
  ListenEvents,
  EmitEvents,
  ServerSideEvents,
  SocketData
>;

export type RemoteSocketIoSocket = RemoteSocket<EmitEvents, SocketData>;
