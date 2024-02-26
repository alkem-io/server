import {
  CLIENT_BROADCAST,
  DISCONNECT,
  DISCONNECTING,
  ROOM_USER_CHANGE,
  SERVER_BROADCAST,
  SERVER_VOLATILE_BROADCAST,
} from '../../services/external/excalidraw-backend/types/event.names';
import { SocketIoServer } from '../../services/external/excalidraw-backend/types/socket.io.server';

export interface IExcalidrawEvent {
  handleEvent(wsServer: SocketIoServer): Promise<void> | void;
}

export abstract class BaseEvent implements IExcalidrawEvent {
  protected constructor(
    public roomID: string,
    public publisherId?: string,
    public name?: string,
    public data?: ArrayBuffer
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleEvent(wsServer: SocketIoServer): Promise<void> | void {
    throw Error('You are using the base implementation of an abstract class');
  }
}

export class RoomUserChangeEvent extends BaseEvent implements IExcalidrawEvent {
  constructor(
    public roomID: string,
    public socketIDs: Array<string>, // all sockets in the remote room
    public publisherId?: string
  ) {
    super(roomID, publisherId, ROOM_USER_CHANGE);
  }

  async handleEvent(wsServer: SocketIoServer): Promise<void> {
    const ownSocketIds = (await wsServer.in(this.roomID).fetchSockets()).map(
      socket => socket.id
    );

    const deduplicator = new Set([...ownSocketIds, ...this.socketIDs]);
    wsServer.in(this.roomID).emit(ROOM_USER_CHANGE, Array.from(deduplicator));
  }
}

export class ServerBroadcastEvent
  extends BaseEvent
  implements IExcalidrawEvent
{
  constructor(
    public roomID: string,
    public data: ArrayBuffer,
    public publisherId?: string
  ) {
    super(roomID, publisherId, SERVER_BROADCAST);
  }

  handleEvent(wsServer: SocketIoServer): Promise<void> | void {
    wsServer.in(this.roomID).emit(CLIENT_BROADCAST, this.data);
  }
}

export class ServerVolatileBroadcastEvent
  extends BaseEvent
  implements IExcalidrawEvent
{
  constructor(
    public roomID: string,
    public data: ArrayBuffer,
    public publisherId?: string
  ) {
    super(roomID, publisherId, SERVER_VOLATILE_BROADCAST);
  }

  handleEvent(wsServer: SocketIoServer): Promise<void> | void {
    wsServer.in(this.roomID).emit(CLIENT_BROADCAST, this.data);
  }
}

export class DisconnectingEvent extends BaseEvent implements IExcalidrawEvent {
  constructor(public publisherId?: string) {
    super('N/A', publisherId, DISCONNECTING);
  }

  handleEvent(): void {
    return;
  }
}

export class DisconnectedEvent extends BaseEvent implements IExcalidrawEvent {
  constructor(public publisherId?: string) {
    super('N/A', publisherId, DISCONNECT);
  }

  handleEvent(): void {
    return;
  }
}
