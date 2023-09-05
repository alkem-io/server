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
import {
  EXCALIDRAW_PUBSUB_PROVIDER,
  EXCALIDRAW_SERVER,
} from '@constants/index';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { AgentInfo } from '@core/authentication';
import { OryDefaultIdentitySchema } from '@core/authentication/ory.default.identity.schema';
import { WhiteboardRtService } from '@domain/common/whiteboard-rt';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ExcalidrawEventPublisherService } from '@services/excalidraw-pubsub/publisher';

export const ExcalidrawServerFactoryProvider: FactoryProvider = {
  provide: EXCALIDRAW_SERVER,
  inject: [
    WINSTON_MODULE_NEST_PROVIDER,
    ConfigService,
    AuthenticationService,
    AuthorizationService,
    WhiteboardRtService,
    EXCALIDRAW_PUBSUB_PROVIDER,
  ],
  useFactory: (
    logger: LoggerService,
    configService: ConfigService,
    authService: AuthenticationService,
    authorizationService: AuthorizationService,
    whiteboardRtService: WhiteboardRtService,
    excalidrawEventPublisher: ExcalidrawEventPublisherService
  ) => {
    const port = process.env.EXCALIDRAW_SERVER_PORT;

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

    const server = http.createServer();

    server.listen(port, () => {
      logger?.verbose?.(
        `listening on port: ${port}`,
        LogContext.EXCALIDRAW_SERVER
      );
    });

    try {
      const io = new SocketIO(server, {
        transports: ['websocket', 'polling'],
        allowEIO3: true,
      });

      io.on('connection', async socket => {
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

        io.to(`${socket.id}`).emit('init-room');
        socket.on('join-room', async (roomID: string) => {
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
          excalidrawEventPublisher.publishJoinRoom({ roomID });
          logger?.verbose?.(
            `${agentInfo.userID} has joined ${roomID}`,
            LogContext.EXCALIDRAW_SERVER
          );

          const sockets = await io.in(roomID).fetchSockets();
          if (sockets.length <= 1) {
            io.to(`${socket.id}`).emit('first-in-room');
          } else {
            logger?.verbose?.(
              `User ${agentInfo.userID} emitted to room ${roomID}`,
              LogContext.EXCALIDRAW_SERVER
            );
            socket.broadcast.to(roomID).emit('new-user', socket.id);
            excalidrawEventPublisher.publishNewUser({
              roomID,
              socketID: socket.id,
            });
          }

          const socketIDs = sockets.map(socket => socket.id);
          io.in(roomID).emit('room-user-change', socketIDs);
          excalidrawEventPublisher.publishRoomUserChange({
            roomID,
            socketIDs,
          });
        });

        socket.on('server-broadcast', (roomID: string, data: ArrayBuffer) => {
          socket.broadcast.to(roomID).emit('client-broadcast', data);
          excalidrawEventPublisher.publishServerBroadcast({
            roomID,
            data,
          });
        });

        socket.on(
          'server-volatile-broadcast',
          (roomID: string, data: ArrayBuffer) => {
            socket.volatile.broadcast.to(roomID).emit('client-broadcast', data);
          }
        );

        socket.on('disconnecting', async () => {
          logger?.verbose?.(
            `User '${agentInfo.userID}' has disconnected`,
            LogContext.EXCALIDRAW_SERVER
          );
          /***
           * idk why is this needed
           * seems very expensive
           * send the room id while disconnecting instead of trying to find which is it
           */
          for (const roomID in socket.rooms) {
            const otherClients = (await io.in(roomID).fetchSockets()).filter(
              _socket => _socket.id !== socket.id
            );

            if (otherClients.length > 0) {
              socket.broadcast.to(roomID).emit(
                'room-user-change',
                otherClients.map(socket => socket.id)
              );
            }
          }
        });

        socket.on('disconnect', () => {
          socket.removeAllListeners();
          socket.disconnect();
        });
      });
    } catch (error) {
      console.error(error);
    }

    const closeConnection = (socket: Socket, message: string) => {
      socket.removeAllListeners();
      socket.emit('connection-closed', message);
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
          logger.error?.(e);
        }
      });
    };
  },
};
