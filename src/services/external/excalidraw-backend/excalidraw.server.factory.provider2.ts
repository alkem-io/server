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
} from '@services/external/excalidraw-backend/event.names';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

export const ExcalidrawServerFactoryProvider2: FactoryProvider = {
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
  ) => {
    const port = configService.get(ConfigurationTypes.HOSTING).whiteboard_rt
      .port;

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
      const { host, port } = configService.get(
        ConfigurationTypes.STORAGE
      ).redis;

      const pubClient = createClient({ url: `redis://${host}:${port}` });
      const subClient = pubClient.duplicate();

      const redisAdapter = createAdapter(pubClient, subClient);

      const wsServer = new SocketIO(httpServer, {
        transports: ['websocket'],
        allowEIO3: true,
        adapter: redisAdapter,
      });

      wsServer.on(CONNECTION, async socket => {
        let agentInfo: AgentInfo;
        try {
          agentInfo = await authenticate(socket.handshake.headers);
        } catch (e) {
          const err = e as Error;
          logger.error(
            `Error when trying to authenticate with excalidraw server: ${err.message}`,
            LogContext.EXCALIDRAW_SERVER
          );
          closeConnection(socket, err.message);
          return;
        }

        logger?.verbose?.(
          `User '${agentInfo.userID}' established connection`,
          LogContext.EXCALIDRAW_SERVER
        );

        wsServer.to(socket.id).emit(INIT_ROOM);
        socket.on(JOIN_ROOM, async (roomID: string) => {
          try {
            const whiteboardRt =
              await whiteboardRtService.getWhiteboardRtOrFail(roomID);
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
          if (sockets.length <= 1) {
            wsServer.to(`${socket.id}`).emit(FIRST_IN_ROOM);
          } else {
            logger?.verbose?.(
              `User ${agentInfo.userID} emitted to room ${roomID}`,
              LogContext.EXCALIDRAW_SERVER
            );
            socket.broadcast.to(roomID).emit(NEW_USER, socket.id);
            // excalidrawEventPublisher.publishNewUser({
            //   roomID,
            //   socketID: socket.id,
            // });
            // todo; testing if not need
          }

          const socketIDs = sockets.map(socket => socket.id);
          wsServer.in(roomID).emit(ROOM_USER_CHANGE, socketIDs);
        });

        socket.on(SERVER_BROADCAST, (roomID: string, data: ArrayBuffer) => {
          socket.broadcast.to(roomID).emit(CLIENT_BROADCAST, data);
        });

        socket.on(
          SERVER_VOLATILE_BROADCAST,
          (roomID: string, data: ArrayBuffer) => {
            socket.volatile.broadcast.to(roomID).emit(CLIENT_BROADCAST, data);
          }
        );

        socket.on(DISCONNECTING, async () => {
          logger?.verbose?.(
            `User '${agentInfo.userID}' has disconnected`,
            LogContext.EXCALIDRAW_SERVER
          );
          /***
           * idk why is this needed
           * seems very expensive
           * send the room id while disconnecting instead of trying to find which is it
           */
          // todo: send roomID
          /***
           * For all the rooms this socket is
           * send a room change event
           */
          for (const roomID in socket.rooms) {
            const otherClients = (
              await wsServer.in(roomID).fetchSockets()
            ).filter(_socket => _socket.id !== socket.id);

            if (otherClients.length > 0) {
              const socketIDs = otherClients.map(socket => socket.id);
              socket.broadcast.to(roomID).emit(ROOM_USER_CHANGE, socketIDs);
            }
          }
        });

        socket.on(DISCONNECT, () => {
          socket.removeAllListeners();
          socket.disconnect();
        });
      });
    } catch (error) {
      logger.error(error, LogContext.EXCALIDRAW_SERVER);
    }

    const closeConnection = (socket: Socket, message: string) => {
      socket.removeAllListeners();
      socket.emit(CONNECTION_CLOSED, message);
      socket.disconnect();
    };

    /***
     * Sets the user into the context field or close the connection
     */
    const authenticate = (
      headers: Record<string, string | string[] | undefined>
    ): Promise<AgentInfo> => {
      return new Promise(async (resolve, reject) => {
        const cookie = headers.cookie as string;

        try {
          const { data: session } = await kratosClient.toSession({
            cookie,
          });

          if (!session) {
            logger.verbose?.(
              'No Ory Kratos session',
              LogContext.EXCALIDRAW_SERVER
            );
            resolve(await authService.createAgentInfo());
          }

          const oryIdentity = session.identity as OryDefaultIdentitySchema;
          resolve(await authService.createAgentInfo(oryIdentity));
        } catch (e) {
          reject(e);
          logger.error?.(e, LogContext.EXCALIDRAW_SERVER);
        }
      });
    };
  },
};
