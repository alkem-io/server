import { Server as SocketIO } from 'socket.io';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Configuration, FrontendApi } from '@ory/kratos-client';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { EXCALIDRAW_SERVER, UUID_LENGTH } from '@common/constants';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WhiteboardRtService } from '@domain/common/whiteboard-rt';
import {
  getUserInfo,
  closeConnection,
  disconnectEventHandler,
  disconnectingEventHandler,
  joinRoomEventHandler,
  serverBroadcastEventHandler,
  serverVolatileBroadcastEventHandler,
} from './utils';
import {
  CONNECTION,
  DISCONNECT,
  DISCONNECTING,
  INIT_ROOM,
  JOIN_ROOM,
  SERVER_BROADCAST,
  SERVER_VOLATILE_BROADCAST,
} from './types';
import { setInterval } from 'timers';
import {
  CREATE_ROOM,
  DELETE_ROOM,
} from '@services/external/excalidraw-backend/adapters/adapter.event.names';

export type RoomTimers = Map<string, NodeJS.Timer>;

const WINDOW_LENGTH = 3000;

@Injectable()
export class ExcalidrawServer {
  private readonly timers: RoomTimers = new Map();

  constructor(
    @Inject(EXCALIDRAW_SERVER) private wsServer: SocketIO,
    private configService: ConfigService,
    private authService: AuthenticationService,
    private authorizationService: AuthorizationService,
    private whiteboardRtService: WhiteboardRtService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private logger: LoggerService
  ) {
    this.init().then(() =>
      this.logger.verbose?.(
        'Excalidraw server initialized and running',
        LogContext.EXCALIDRAW_SERVER
      )
    );
  }

  private async init() {
    const kratosPublicBaseUrl = this.configService.get(
      ConfigurationTypes.IDENTITY
    ).authentication.providers.ory.kratos_public_base_url_server;

    const kratosClient = new FrontendApi(
      new Configuration({
        basePath: kratosPublicBaseUrl,
      })
    );

    const adapter = this.wsServer.of('/').adapter;
    adapter.on(DELETE_ROOM, (roomId: string) => {
      if (!isRoomId(roomId)) {
        return;
      }
      console.log(roomId, 'room deleted');
      this.timers.delete(roomId);
    });
    adapter.on(CREATE_ROOM, (roomId: string) => {
      if (!isRoomId(roomId)) {
        return;
      }
      console.log(roomId, 'room created');
      const timer = this.timers.get(roomId);
      if (!timer) {
        const timer = setInterval(async () => {
          const windowEnd = Date.now();
          const windowStart = windowEnd - WINDOW_LENGTH;

          const sockets = await this.wsServer.in(roomId).fetchSockets();

          sockets.forEach(socket => {
            const lastContributed = socket.data.lastContributed;
            // was the last contribution in that window
            if (
              lastContributed >= windowStart &&
              windowEnd >= lastContributed
            ) {
              console.log(socket.id, 'contribution event');
            }
          });
        }, WINDOW_LENGTH);

        this.timers.set(roomId, timer);
      }
    });

    this.wsServer.on(CONNECTION, async socket => {
      const agentInfo = await getUserInfo(
        kratosClient,
        socket.handshake.headers,
        this.logger,
        this.authService
      );

      if (!agentInfo) {
        closeConnection(socket, 'Not able to authenticate user');
        return;
      }

      this.logger?.verbose?.(
        `User '${agentInfo.userID}' established connection`,
        LogContext.EXCALIDRAW_SERVER
      );

      this.wsServer.to(socket.id).emit(INIT_ROOM);
      // client events ONLY
      socket.on(
        JOIN_ROOM,
        async (roomID: string) =>
          await joinRoomEventHandler(
            roomID,
            agentInfo,
            socket,
            this.wsServer,
            this.whiteboardRtService,
            this.authorizationService,
            this.logger
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
          await disconnectingEventHandler(
            agentInfo,
            this.wsServer,
            socket,
            this.logger
          )
      );

      socket.on(DISCONNECT, () => disconnectEventHandler(socket));
    });
  }
}

const isRoomId = (id: string) => id.length === UUID_LENGTH; // todo: not that reliable
