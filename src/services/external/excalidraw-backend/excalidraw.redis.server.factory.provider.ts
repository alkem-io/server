import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { FactoryProvider, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration, FrontendApi } from '@ory/kratos-client';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Server as SocketIO, Socket } from 'socket.io';
import http from 'http';
import {
  AuthorizationPrivilege,
  ConfigurationTypes,
  LogContext,
} from '@common/enums';
import { APP_ID, EXCALIDRAW_SERVER } from '@constants/index';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { AgentInfo } from '@core/authentication';
import { OryDefaultIdentitySchema } from '@core/authentication/ory.default.identity.schema';
import { WhiteboardRtService } from '@domain/common/whiteboard-rt';
import { AuthorizationService } from '@core/authorization/authorization.service';

import {
  CLIENT_BROADCAST,
  CONNECTION,
  CONNECTION_CLOSED,
  DISCONNECT,
  DISCONNECTING,
  FIRST_IN_ROOM,
  INIT_ROOM,
  JOIN_ROOM,
  NEW_USER,
  ROOM_USER_CHANGE,
  SERVER_BROADCAST,
  SERVER_VOLATILE_BROADCAST,
} from './event.names';

export const ExcalidrawRedisServerFactoryProvider: FactoryProvider = {
  provide: EXCALIDRAW_SERVER,
  inject: [
    APP_ID,
    WINSTON_MODULE_NEST_PROVIDER,
    ConfigService,
    AuthenticationService,
    AuthorizationService,
    WhiteboardRtService,
  ],
  useFactory: async (
    appId: string,
    logger: LoggerService,
    configService: ConfigService,
    authService: AuthenticationService,
    authorizationService: AuthorizationService,
    whiteboardRtService: WhiteboardRtService
  ) =>
    factory(
      appId,
      logger,
      configService,
      authService,
      authorizationService,
      whiteboardRtService
    ),
};

const factory = async (
  appId: string,
  logger: LoggerService,
  configService: ConfigService,
  authService: AuthenticationService,
  authorizationService: AuthorizationService,
  whiteboardRtService: WhiteboardRtService
) => {
  const port = configService.get(ConfigurationTypes.HOSTING).whiteboard_rt.port;

  if (!port) {
    logger.error('Port not provided!', EXCALIDRAW_SERVER);
    return;
  }

  const kratosPublicBaseUrl = configService.get(ConfigurationTypes.IDENTITY)
    .authentication.providers.ory.kratos_public_base_url_server;

  const kratosClient = new FrontendApi(
    new Configuration({
      basePath: kratosPublicBaseUrl,
    })
  );

  const httpServer = http.createServer();

  httpServer.listen(port, () => {
    logger?.verbose?.(
      `listening on port: ${port}`,
      LogContext.EXCALIDRAW_SERVER
    );
  });

  try {
    const { host, port } = configService.get(ConfigurationTypes.STORAGE).redis;

    const pubClient = createClient({ url: `redis://${host}:${port}` });
    const subClient = pubClient.duplicate();

    const redisAdapter = createAdapter(pubClient, subClient);

    const wsServer = new SocketIO(httpServer, {
      transports: ['websocket'],
      allowEIO3: true,
      adapter: redisAdapter,
    });

    wsServer.on(CONNECTION, async socket => {
      const agentInfo = await getUserInfo(
        kratosClient,
        socket.handshake.headers,
        logger,
        authService
      );

      if (!agentInfo) {
        closeConnection(socket, 'Not able to authenticate user');
        return;
      }

      logger?.verbose?.(
        `User '${agentInfo.userID}' established connection`,
        LogContext.EXCALIDRAW_SERVER
      );

      wsServer.to(socket.id).emit(INIT_ROOM);
      // client events ONLY
      socket.on(
        JOIN_ROOM,
        async (roomID: string) =>
          await joinRoomEventHandler(
            roomID,
            agentInfo,
            socket,
            wsServer,
            whiteboardRtService,
            authorizationService,
            logger
          )
      );

      socket.on(SERVER_BROADCAST, (roomID: string, data: ArrayBuffer) =>
        serverBroadcastEventHandler(roomID, data, socket)
      );

      socket.on(
        SERVER_VOLATILE_BROADCAST,
        (roomID: string, data: ArrayBuffer) =>
          serverVolatileBroadcastEventHandler(roomID, data, socket)
      );

      socket.on(
        DISCONNECTING,
        async () =>
          await disconnectingEventHandler(agentInfo, wsServer, socket, logger)
      );

      socket.on(DISCONNECT, () => disconnectEventHandler(socket));
    });
  } catch (error) {
    logger.error(error, LogContext.EXCALIDRAW_SERVER);
  }
};

/* Sets the user into the context field or closes the connection */
const authenticate = async (
  kratosFrontEndApi: FrontendApi,
  headers: Record<string, string | string[] | undefined>,
  logger: LoggerService,
  authService: AuthenticationService
): Promise<AgentInfo> => {
  const cookie = headers.cookie as string;

  try {
    const { data: session } = await kratosFrontEndApi.toSession({
      cookie,
    });

    if (!session) {
      logger.verbose?.('No Ory Kratos session', LogContext.EXCALIDRAW_SERVER);
      return authService.createAgentInfo();
    }

    const oryIdentity = session.identity as OryDefaultIdentitySchema;
    return authService.createAgentInfo(oryIdentity);
  } catch (e: any) {
    throw new Error(e?.message);
  }
};
/* returns the user agent info */
const getUserInfo = async (
  kratosFrontEndApi: FrontendApi,
  headers: Record<string, string | string[] | undefined>,
  logger: LoggerService,
  authService: AuthenticationService
) => {
  try {
    return await authenticate(kratosFrontEndApi, headers, logger, authService);
  } catch (e) {
    const err = e as Error;
    logger.error(
      `Error when trying to authenticate with excalidraw server: ${err.message}`,
      err.stack,
      LogContext.EXCALIDRAW_SERVER
    );
    return undefined;
  }
};
/* This event is coming from the client; whenever they request to join a room */
const joinRoomEventHandler = async (
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

  logger?.verbose?.(
    `${agentInfo.userID} has joined ${roomID}`,
    LogContext.EXCALIDRAW_SERVER
  );

  const sockets = await wsServer.in(roomID).fetchSockets();
  if (sockets.length === 1) {
    wsServer.to(socket.id).emit(FIRST_IN_ROOM);
  } else {
    logger?.verbose?.(
      `User ${agentInfo.userID} emitted to room ${roomID}`,
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
const serverBroadcastEventHandler = (
  roomID: string,
  data: ArrayBuffer,
  socket: Socket
) => {
  socket.broadcast.to(roomID).emit(CLIENT_BROADCAST, data);
};
/*
Built-in event for handling broadcast;
messages are sent to all sockets except the sender socket;
not guaranteed to be received if the underlying connection is not ready;
useful for sending event where only the latest is useful, e.g. cursor location
 */
const serverVolatileBroadcastEventHandler = (
  roomID: string,
  data: ArrayBuffer,
  socket: Socket
) => {
  socket.volatile.broadcast.to(roomID).emit(CLIENT_BROADCAST, data);
};
/* Built-in event for handling socket disconnects */
const disconnectingEventHandler = async (
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

const disconnectEventHandler = async (socket: Socket) => {
  socket.removeAllListeners();
  socket.disconnect();
};

const closeConnection = (socket: Socket, message?: string) => {
  socket.removeAllListeners();
  if (message) {
    socket.emit(CONNECTION_CLOSED, message);
  }
  socket.disconnect();
};
