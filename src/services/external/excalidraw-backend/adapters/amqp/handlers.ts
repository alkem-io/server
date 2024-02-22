import { ExcalidrawEventPublisherService } from '@services/excalidraw-pubsub/publisher';
import { ROOM_USER_CHANGE } from '../../types/event.names';
import { SocketIoServer, SocketIoSocket } from '../../types';

/* This event is coming from the client; whenever they request to join a room */
export const joinRoomEventAmqpHandler = async (
  roomID: string,
  wsServer: SocketIoServer,
  excalidrawEventPublisher: ExcalidrawEventPublisherService
) => {
  const sockets = await wsServer.in(roomID).fetchSockets();
  const socketIDs = sockets.map(socket => socket.id);

  wsServer.in(roomID).emit(ROOM_USER_CHANGE, socketIDs);
  excalidrawEventPublisher.publishRoomUserChange({
    roomID,
    socketIDs,
  });
};
/*
Built-in event for handling broadcast;
messages are sent to all sockets except the sender socket in reliable manner
 */
export const serverBroadcastEventAmqpHandler = (
  roomID: string,
  data: ArrayBuffer,
  excalidrawEventPublisher: ExcalidrawEventPublisherService
) => {
  excalidrawEventPublisher.publishServerBroadcast({
    roomID,
    data,
  });
};
/*
Built-in event for handling broadcast;
messages are sent to all sockets except the sender socket;
not guaranteed to be received if the underlying connection is not ready;
useful for sending event where only the latest is useful, e.g. cursor location
 */
export const serverVolatileBroadcastEventAmqpHandler = (
  roomID: string,
  data: ArrayBuffer,
  excalidrawEventPublisher: ExcalidrawEventPublisherService
) => {
  excalidrawEventPublisher.publishServerVolatileBroadcast({
    roomID,
    data,
  });
};
export const idleStateEventAmqpHandler = (
  roomID: string,
  data: ArrayBuffer,
  excalidrawEventPublisher: ExcalidrawEventPublisherService
) => {
  excalidrawEventPublisher.publishIdleState({
    roomID,
    data,
  });
};
/* Built-in event for handling socket disconnects */
export const disconnectingEventAmqpHandler = async (
  wsServer: SocketIoServer,
  socket: SocketIoSocket,
  excalidrawEventPublisher: ExcalidrawEventPublisherService
) => {
  excalidrawEventPublisher.publishDisconnecting({
    roomID: 'NA',
  });
  for (const roomID of socket.rooms) {
    const otherClientIds = (await wsServer.in(roomID).fetchSockets())
      .filter(_socket => _socket.id !== socket.id)
      .map(socket => socket.id);

    excalidrawEventPublisher.publishRoomUserChange({
      roomID,
      socketIDs: otherClientIds,
    });
  }
};

export const disconnectEventAmqpHandler = async (
  excalidrawEventPublisher: ExcalidrawEventPublisherService
) => {
  excalidrawEventPublisher.publishDisconnected({ roomID: 'NA' });
};
