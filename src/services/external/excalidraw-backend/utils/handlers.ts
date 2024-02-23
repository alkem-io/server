import { LoggerService } from '@nestjs/common';
import { WhiteboardService } from '@domain/common/whiteboard';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { LogContext } from '@common/enums';
import {
  CLIENT_BROADCAST,
  FIRST_IN_ROOM,
  IDLE_STATE,
  NEW_USER,
  ROOM_USER_CHANGE,
  SocketIoServer,
  SocketIoSocket,
} from '../types';
import { canUserRead, canUserUpdate, closeConnection } from './util';
import { checkSession } from '@services/external/excalidraw-backend/utils/check.session';

export const authorizeWithRoomAndJoinHandler = async (
  roomID: string,
  socket: SocketIoSocket,
  wsServer: SocketIoServer,
  whiteboardService: WhiteboardService,
  authorizationService: AuthorizationService,
  logger: LoggerService
) => {
  const whiteboard = await whiteboardService.getWhiteboardOrFail(roomID);
  const agentInfo = socket.data.agentInfo;

  if (!canUserRead(authorizationService, agentInfo, whiteboard.authorization)) {
    logger.error(
      `Unable to authorize User '${agentInfo.userID}' with Whiteboard: '${whiteboard.id}'`,
      undefined,
      LogContext.EXCALIDRAW_SERVER
    );
    closeConnection(socket, 'Unauthorized read access');
    return;
  }

  socket.data.lastContributed = -1;
  socket.data.lastCursorMove = -1;
  socket.data.read = true; // already authorized
  socket.data.update = canUserUpdate(
    authorizationService,
    agentInfo,
    whiteboard.authorization
  );

  await joinRoomHandler(roomID, socket, wsServer, logger);
};
/* This event is coming from the client; whenever they request to join a room */
const joinRoomHandler = async (
  roomID: string,
  socket: SocketIoSocket,
  wsServer: SocketIoServer,
  logger: LoggerService
) => {
  if (!socket.data.read) {
    return;
  }

  await socket.join(roomID);

  const { agentInfo } = socket.data;

  logger?.verbose?.(
    `User '${socket.data.agentInfo.userID}' has joined room '${roomID}'`,
    LogContext.EXCALIDRAW_SERVER
  );

  const sockets = await wsServer.in(roomID).fetchSockets();
  if (sockets.length === 1) {
    logger?.verbose?.(
      `User '${agentInfo.userID}' is first in room '${roomID}'`,
      LogContext.EXCALIDRAW_SERVER
    );
    wsServer.to(socket.id).emit(FIRST_IN_ROOM);
  } else {
    logger?.verbose?.(
      `User '${agentInfo.userID}' emitted to room '${roomID}'`,
      LogContext.EXCALIDRAW_SERVER
    );
    socket.broadcast.to(roomID).emit(NEW_USER, socket.id);
  }

  const socketIDs = sockets.map(socket => socket.id);
  wsServer.in(roomID).emit(ROOM_USER_CHANGE, socketIDs);
};
/*
Built-in event for handling broadcast;
messages are sent to all sockets except the sender socket in reliable manner
 */
export const serverBroadcastEventHandler = (
  roomID: string,
  data: ArrayBuffer,
  socket: SocketIoSocket
) => {
  socket.broadcast.to(roomID).emit(CLIENT_BROADCAST, data);
  socket.data.lastContributed = Date.now();
};
/*
Built-in event for handling broadcast;
messages are sent to all sockets except the sender socket;
not guaranteed to be received if the underlying connection is not ready;
useful for sending event where only the latest is useful, e.g. cursor location
 */
export const serverVolatileBroadcastEventHandler = (
  roomID: string,
  data: ArrayBuffer,
  socket: SocketIoSocket
) => {
  socket.volatile.broadcast.to(roomID).emit(CLIENT_BROADCAST, data);
  socket.data.lastCursorMove = Date.now();
};
// broadcasts requests from socket to all other sockets
export const requestBroadcastEventHandler = (
  roomID: string,
  data: ArrayBuffer,
  socket: SocketIoSocket
) => {
  socket.broadcast.to(roomID).emit(CLIENT_BROADCAST, data);
};
export const idleStateEventHandler = (
  roomID: string,
  data: ArrayBuffer,
  socket: SocketIoSocket
) => {
  socket.broadcast.to(roomID).emit(IDLE_STATE, data);
};
/* Built-in event for handling socket disconnects */
export const disconnectingEventHandler = async (
  wsServer: SocketIoServer,
  socket: SocketIoSocket,
  logger: LoggerService
) => {
  logger?.verbose?.(
    `User '${socket.data.agentInfo.userID}' has disconnected`,
    LogContext.EXCALIDRAW_SERVER
  );
  for (const roomID of socket.rooms) {
    const otherClientIds = (await wsServer.in(roomID).fetchSockets())
      .filter(_socket => _socket.id !== socket.id)
      .map(socket => socket.id);

    if (otherClientIds.length > 0) {
      socket.broadcast.to(roomID).emit(ROOM_USER_CHANGE, otherClientIds);
    }
  }

  closeConnection(socket);
};

export const disconnectEventHandler = async (socket: SocketIoSocket) => {
  socket.removeAllListeners();
  socket.disconnect(true);
};

export const checkSessionHandler = (socket: SocketIoSocket) => {
  if (socket.disconnected) {
    return;
  }

  const { session } = socket.data;
  const result = checkSession(session);

  if (result) {
    closeConnection(socket, result);
  }
};
