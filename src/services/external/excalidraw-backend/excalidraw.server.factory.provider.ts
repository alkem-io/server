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
} from '@services/external/excalidraw-backend/event.names';
import {
  RoomUserChangePayload,
  ServerVolatileBroadcastPayload,
} from '@services/excalidraw-pubsub/payloads';

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

    let subIds: number[] = [];
    try {
      const wsServer = new SocketIO(httpServer, {
        transports: ['websocket', 'polling'],
        allowEIO3: true,
      });

      subIds = await excalidrawEventSubscriber.subscribeToAll(async payload => {
        // Some messages can be coming from this instance of the service
        // so filter them out
        if (payload.publisherId !== appId) {
          const { roomID, name } = payload;
          // todo: try redesigning the handling using the visitor pattern
          switch (name) {
            case SERVER_VOLATILE_BROADCAST: {
              const volatilePayload = payload as ServerVolatileBroadcastPayload;
              const buffer = new Uint8Array(volatilePayload.data).buffer;
              wsServer.volatile.in(roomID).emit(CLIENT_BROADCAST, buffer);
              break;
            }
            case SERVER_BROADCAST: {
              const broadcastPayload =
                payload as ServerVolatileBroadcastPayload;
              wsServer.in(roomID).emit(CLIENT_BROADCAST, broadcastPayload.data);
              break;
            }
            case DISCONNECTING: {
              // todo: rework using roomID
              // idk: todo
              break;
            }
            case DISCONNECT: {
              // no handling required imo
              break;
            }
            case ROOM_USER_CHANGE: {
              const userChangePayload = payload as RoomUserChangePayload;
              const ownSocketIds = (
                await wsServer.in(roomID).fetchSockets()
              ).map(socket => socket.id);
              wsServer
                .in(roomID)
                .emit(ROOM_USER_CHANGE, [
                  ...ownSocketIds,
                  ...userChangePayload.socketIDs,
                ]);
              break;
            }
          }
        }
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
          excalidrawEventPublisher.publishRoomUserChange({
            roomID,
            socketIDs,
          });
        });

        socket.on(SERVER_BROADCAST, (roomID: string, data: ArrayBuffer) => {
          socket.broadcast.to(roomID).emit(CLIENT_BROADCAST, data);
          excalidrawEventPublisher.publishServerBroadcast({
            roomID,
            data,
          });
        });

        socket.on(
          SERVER_VOLATILE_BROADCAST,
          (roomID: string, data: ArrayBuffer) => {
            socket.volatile.broadcast.to(roomID).emit(CLIENT_BROADCAST, data);
            // wsServer.volatile.to(roomID).emit(CLIENT_BROADCAST, data);
            excalidrawEventPublisher.publishServerVolatileBroadcast({
              roomID,
              data,
            });
          }
        );

        socket.on(DISCONNECTING, async () => {
          logger?.verbose?.(
            `User '${agentInfo.userID}' has disconnected`,
            LogContext.EXCALIDRAW_SERVER
          );
          excalidrawEventPublisher.publishDisconnecting({
            roomID: 'NA',
          });
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
              excalidrawEventPublisher.publishRoomUserChange({
                roomID,
                socketIDs,
              });
            }
          }
        });

        socket.on(DISCONNECT, () => {
          socket.removeAllListeners();
          socket.disconnect();
          excalidrawEventPublisher.publishDisconnected({
            roomID: 'NA',
          });
        });
      });
    } catch (error) {
      logger.error(error, LogContext.EXCALIDRAW_SERVER);
      excalidrawEventSubscriber.unsubscribe(subIds);
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
