import { Server as SocketIO, Socket } from 'socket.io';
import { LoggerService } from '@nestjs/common';
import { WhiteboardRtService } from '@domain/common/whiteboard-rt';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import {
  CLIENT_BROADCAST,
  CONNECTION_CLOSED,
  FIRST_IN_ROOM,
  NEW_USER,
  ROOM_USER_CHANGE,
} from '../types';

/* This event is coming from the client; whenever they request to join a room */
export const joinRoomEventHandler = async (
  roomID: string,
  agentInfo: AgentInfo,
  socket: Socket,
  wsServer: SocketIO,
  whiteboardRtService: WhiteboardRtService,
  authorizationService: AuthorizationService,
  logger: LoggerService
) => {
  try {
    const whiteboardRt = await whiteboardRtService.getWhiteboardRtOrFail(
      roomID
    );
    await authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboardRt.authorization,
      AuthorizationPrivilege.UPDATE_CONTENT,
      `access whiteboardRt: ${whiteboardRt.id}`
    );
  } catch (e) {
    const err = e as Error;
    logger.error(
      `Error when trying to authorize the user with the whiteboard: ${err.message}`,
      LogContext.EXCALIDRAW_SERVER
    );
    closeConnection(socket, err.message);
    return;
  }

  await socket.join(roomID);
  socket.data.lastContributed = -1;

  logger?.verbose?.(
    `User '${agentInfo.userID}' has joined room '${roomID}'`,
    LogContext.EXCALIDRAW_SERVER
  );

  const sockets = await wsServer.in(roomID).fetchSockets();
  if (sockets.length === 1) {
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
  socket: Socket
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
  socket: Socket
) => {
  socket.volatile.broadcast.to(roomID).emit(CLIENT_BROADCAST, data);
};
/* Built-in event for handling socket disconnects */
export const disconnectingEventHandler = async (
  agentInfo: AgentInfo,
  wsServer: SocketIO,
  socket: Socket,
  logger: LoggerService
) => {
  logger?.verbose?.(
    `User '${agentInfo.userID}' has disconnected`,
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

export const disconnectEventHandler = async (socket: Socket) => {
  socket.removeAllListeners();
  socket.disconnect(true);
};

export const closeConnection = (socket: Socket, message?: string) => {
  if (message) {
    socket.emit(CONNECTION_CLOSED, message);
  }
  socket.removeAllListeners();
  socket.disconnect(true);
};
