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
import { ExcalidrawEventPublisherService } from '@services/excalidraw-pubsub/publisher';
import { ExcalidrawEventSubscriberService } from '@services/excalidraw-pubsub/subscriber';

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

export const ExcalidrawServerFactoryProvider: FactoryProvider = {
  provide: EXCALIDRAW_SERVER,
  inject: [
    APP_ID,
    WINSTON_MODULE_NEST_PROVIDER,
    ConfigService,
    AuthenticationService,
    AuthorizationService,
    WhiteboardRtService,
    ExcalidrawEventPublisherService,
    ExcalidrawEventSubscriberService,
  ],
  useFactory: async (
    appId: string,
    logger: LoggerService,
    configService: ConfigService,
    authService: AuthenticationService,
    authorizationService: AuthorizationService,
    whiteboardRtService: WhiteboardRtService,
    excalidrawEventPublisher: ExcalidrawEventPublisherService,
    excalidrawEventSubscriber: ExcalidrawEventSubscriberService
  ) =>
    factory(
      appId,
      logger,
      configService,
      authService,
      authorizationService,
      whiteboardRtService,
      excalidrawEventPublisher,
      excalidrawEventSubscriber
    ),
};

const factory = async (
  appId: string,
  logger: LoggerService,
  configService: ConfigService,
  authService: AuthenticationService,
  authorizationService: AuthorizationService,
  whiteboardRtService: WhiteboardRtService,
  excalidrawEventPublisher: ExcalidrawEventPublisherService,
  excalidrawEventSubscriber: ExcalidrawEventSubscriberService
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
    const wsServer = new SocketIO(httpServer, {
      transports: ['websocket', 'polling'],
      allowEIO3: true,
    });
    // subscribe to the state of other server instances
    // events from other servers ONLY
    excalidrawEventSubscriber.subscribeToAll(event =>
      event.handleEvent(wsServer)
    );

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
            excalidrawEventPublisher,
            logger
          )
      );

      socket.on(SERVER_BROADCAST, (roomID: string, data: ArrayBuffer) =>
        serverBroadcastEventHandler(
          roomID,
          data,
          socket,
          excalidrawEventPublisher
        )
      );

      socket.on(
        SERVER_VOLATILE_BROADCAST,
        (roomID: string, data: ArrayBuffer) =>
          serverVolatileBroadcastEventHandler(
            roomID,
            data,
            socket,
            excalidrawEventPublisher
          )
      );

      socket.on(
        DISCONNECTING,
        async () =>
          await disconnectingEventHandler(
            agentInfo,
            wsServer,
            socket,
            logger,
            excalidrawEventPublisher
          )
      );

      socket.on(DISCONNECT, () =>
        disconnectEventHandler(socket, excalidrawEventPublisher)
      );
    });
  } catch (error) {
    logger.error(error, LogContext.EXCALIDRAW_SERVER);
  }
};

/***
 * Sets the user into the context field or close the connection
 */
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
  excalidrawEventPublisher: ExcalidrawEventPublisherService,
  logger: LoggerService
) => {
  try {
    const whiteboardRt = await whiteboardRtService.getWhiteboardRtOrFail(
      roomID
    );
    await authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboardRt.authorization,
      AuthorizationPrivilege.ACCESS_WHITEBOARD_RT,
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
  excalidrawEventPublisher.publishRoomUserChange({
    roomID,
    socketIDs,
  });
};

const serverBroadcastEventHandler = (
  roomID: string,
  data: ArrayBuffer,
  socket: Socket,
  excalidrawEventPublisher: ExcalidrawEventPublisherService
) => {
  socket.broadcast.to(roomID).emit(CLIENT_BROADCAST, data);
  excalidrawEventPublisher.publishServerBroadcast({
    roomID,
    data,
  });
};

const serverVolatileBroadcastEventHandler = (
  roomID: string,
  data: ArrayBuffer,
  socket: Socket,
  excalidrawEventPublisher: ExcalidrawEventPublisherService
) => {
  socket.volatile.broadcast.to(roomID).emit(CLIENT_BROADCAST, data);
  excalidrawEventPublisher.publishServerVolatileBroadcast({
    roomID,
    data,
  });
};

const disconnectingEventHandler = async (
  agentInfo: AgentInfo,
  wsServer: SocketIO,
  socket: Socket,
  logger: LoggerService,
  excalidrawEventPublisher: ExcalidrawEventPublisherService
) => {
  logger?.verbose?.(
    `User '${agentInfo.userID}' has disconnected`,
    LogContext.EXCALIDRAW_SERVER
  );
  excalidrawEventPublisher.publishDisconnecting({
    roomID: 'NA',
  });
  for (const roomID of socket.rooms) {
    const otherClientIds = (await wsServer.in(roomID).fetchSockets())
      .filter(_socket => _socket.id !== socket.id)
      .map(socket => socket.id);

    if (otherClientIds.length > 0) {
      socket.broadcast.to(roomID).emit(ROOM_USER_CHANGE, otherClientIds);
    }

    excalidrawEventPublisher.publishRoomUserChange({
      roomID,
      socketIDs: otherClientIds,
    });
  }

  closeConnection(socket);
};

const disconnectEventHandler = async (
  socket: Socket,
  excalidrawEventPublisher: ExcalidrawEventPublisherService
) => {
  socket.removeAllListeners();
  socket.disconnect();
  excalidrawEventPublisher.publishDisconnected({ roomID: 'NA' });
};

const closeConnection = (socket: Socket, message?: string) => {
  socket.removeAllListeners();
  if (message) {
    socket.emit(CONNECTION_CLOSED, message);
  }
  socket.disconnect();
};
