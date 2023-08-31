import { FactoryProvider, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration, FrontendApi } from '@ory/kratos-client';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Server as SocketIO, Socket } from 'socket.io';
import http from 'http';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { EXCALIDRAW_SERVER } from '@constants/index';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { AgentInfo } from '@core/authentication';
import { OryDefaultIdentitySchema } from '@core/authentication/ory.default.identity.schema';

export const ExcalidrawServerFactoryProvider: FactoryProvider = {
  provide: EXCALIDRAW_SERVER,
  useFactory: (
    logger: LoggerService,
    configService: ConfigService,
    authService: AuthenticationService
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
          logger.verbose?.(
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
        console.log(`${agentInfo.userID} established connection`);

        // authorize the whiteboard

        io.to(`${socket.id}`).emit('init-room');
        socket.on('join-room', async roomID => {
          logger?.verbose?.(
            `${agentInfo.userID} has joined ${roomID}`,
            LogContext.EXCALIDRAW_SERVER
          );
          await socket.join(roomID);
          const sockets = await io.in(roomID).fetchSockets();
          if (sockets.length <= 1) {
            io.to(`${socket.id}`).emit('first-in-room');
          } else {
            logger?.verbose?.(
              `User ${agentInfo.userID} emitted to room ${roomID}`,
              LogContext.EXCALIDRAW_SERVER
            );
            socket.broadcast.to(roomID).emit('new-user', socket.id);
          }

          io.in(roomID).emit(
            'room-user-change',
            sockets.map(socket => socket.id)
          );
        });

        socket.on(
          'server-broadcast',
          (roomID: string, encryptedData: ArrayBuffer, iv: Uint8Array) => {
            socket.broadcast
              .to(roomID)
              .emit('client-broadcast', encryptedData, iv);
          }
        );

        socket.on(
          'server-volatile-broadcast',
          (roomID: string, encryptedData: ArrayBuffer, iv: Uint8Array) => {
            socket.volatile.broadcast
              .to(roomID)
              .emit('client-broadcast', encryptedData, iv);
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
      socket.send(message);
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
  inject: [WINSTON_MODULE_NEST_PROVIDER, ConfigService, AuthenticationService],
};
