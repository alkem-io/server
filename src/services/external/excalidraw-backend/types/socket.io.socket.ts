import { RemoteSocket, Socket } from 'socket.io';
import { DefaultEventsMap, EventsMap } from 'socket.io/dist/typed-events';
import { SocketData } from './socket.data';

export type SocketIoSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;

export type RemoteSocketIoSocket = RemoteSocket<EventsMap, SocketData>;
