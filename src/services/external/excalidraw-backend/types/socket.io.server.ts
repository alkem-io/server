import { Server } from 'socket.io';
import { SocketData } from './socket.data';
import {
  CLIENT_BROADCAST,
  COLLABORATOR_MODE,
  CONNECTION,
  FIRST_IN_ROOM,
  IDLE_STATE,
  INIT_ROOM,
  ROOM_USER_CHANGE,
  SAVED,
  SERVER_BROADCAST,
  SERVER_SAVE_REQUEST,
  SERVER_SIDE_ROOM_DELETED,
  SERVER_VOLATILE_BROADCAST,
} from './event.names';
import { SocketIoSocket } from './socket.io.socket';
import { CollaboratorModeReasons } from './collaboration.mode.reasons';
import { SaveResponse } from './save.reponse';

type ListenEvents = {
  [CONNECTION]: (socket: SocketIoSocket) => void;
  [IDLE_STATE]: (roomId: string, data: ArrayBuffer) => void;
  [SERVER_BROADCAST]: (roomId: string, data: ArrayBuffer) => void;
  [SERVER_VOLATILE_BROADCAST]: (roomId: string, data: ArrayBuffer) => void;
  [SERVER_SIDE_ROOM_DELETED]: (serverId: string, roomId: string) => void;
};
type EmitEvents = {
  [INIT_ROOM]: () => void;
  [CLIENT_BROADCAST]: (data: ArrayBuffer) => void;
  [ROOM_USER_CHANGE]: (socketIDs: Array<string>) => void;
  [SAVED]: () => void;
  [FIRST_IN_ROOM]: () => void;
  [COLLABORATOR_MODE]: (data: {
    mode: 'read' | 'write';
    reason?: CollaboratorModeReasons;
  }) => void;
  [SERVER_SAVE_REQUEST]: (cb: (val: SaveResponse) => void) => void;
};
type ServerSideEvents = {
  [SERVER_SIDE_ROOM_DELETED]: (serverId: string, roomId: string) => void;
};

export type SocketIoServer = Server<
  ListenEvents,
  EmitEvents,
  ServerSideEvents,
  SocketData
>;
