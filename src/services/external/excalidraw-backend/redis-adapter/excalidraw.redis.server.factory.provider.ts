import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { FactoryProvider, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration, FrontendApi } from '@ory/kratos-client';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Server as SocketIO } from 'socket.io';
import http from 'http';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { APP_ID, EXCALIDRAW_SERVER } from '@constants/index';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { WhiteboardRtService } from '@domain/common/whiteboard-rt';
import { AuthorizationService } from '@core/authorization/authorization.service';

import {
  CONNECTION,
  DISCONNECT,
  DISCONNECTING,
  INIT_ROOM,
  JOIN_ROOM,
  SERVER_BROADCAST,
  SERVER_VOLATILE_BROADCAST,
} from '../event.names';
import { getUserInfo } from './util';
import {
  closeConnection,
  disconnectingEventHandler,
  joinRoomEventHandler,
  serverVolatileBroadcastEventHandler,
  serverBroadcastEventHandler,
  disconnectEventHandler,
} from './handlers';

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
