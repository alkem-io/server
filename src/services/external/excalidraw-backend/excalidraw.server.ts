import { clearInterval, setInterval } from 'timers';
import { Server as SocketIO } from 'socket.io';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Configuration, FrontendApi } from '@ory/kratos-client';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { APP_ID, EXCALIDRAW_SERVER, UUID_LENGTH } from '@common/constants';
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
import {
  CREATE_ROOM,
  DELETE_ROOM,
} from '@services/external/excalidraw-backend/adapters/adapter.event.names';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';

type RoomTimers = Map<string, NodeJS.Timer>;

const defaultWindowsSize = 600;

@Injectable()
export class ExcalidrawServer {
  private readonly timers: RoomTimers = new Map();
  private readonly windowSizeMs: number;

  constructor(
    @Inject(EXCALIDRAW_SERVER) private wsServer: SocketIO,
    private configService: ConfigService,
    private authService: AuthenticationService,
    private authorizationService: AuthorizationService,
    private whiteboardRtService: WhiteboardRtService,
    private contributionReporter: ContributionReporterService,
    private communityResolver: CommunityResolverService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private logger: LoggerService,
    @Inject(APP_ID)
    private appId: string
  ) {
    const windowSize = this.configService.get(ConfigurationTypes.INTEGRATIONS)
      ?.contributions.rt_window;

    this.windowSizeMs = (windowSize ?? defaultWindowsSize) * 1000;
    // don't block the constructor
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

      const timer = this.timers.get(roomId);
      clearInterval(timer);

      this.timers.delete(roomId);
    });
    adapter.on(CREATE_ROOM, (roomId: string) => {
      if (!isRoomId(roomId)) {
        return;
      }
      const timer = this.timers.get(roomId);

      if (!timer) {
        const timer = this.startContributionEventTimer(roomId);
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

      socket.data.agentInfo = agentInfo; // todo type

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

  private startContributionEventTimer(roomId: string) {
    return setInterval(async () => {
      const windowEnd = Date.now();
      const windowStart = windowEnd - this.windowSizeMs;

      const { spaceID } =
        await this.communityResolver.getCommunityFromWhiteboardRtOrFail(roomId);
      const wb = await this.whiteboardRtService.getProfile(roomId);
      // const callout = await this.whiteboardRtService.getCallout(roomId);

      const sockets = await this.wsServer.in(roomId).fetchSockets();

      for (const socket of sockets) {
        const lastContributed = socket.data.lastContributed;
        // was the last contribution in that window
        if (lastContributed >= windowStart && windowEnd >= lastContributed) {
          this.contributionReporter.whiteboardRtContribution(
            {
              id: roomId,
              name: wb.displayName,
              space: spaceID,
            },
            {
              id: socket.data.agentInfo.userID,
              email: socket.data.agentInfo.email,
            }
          );
        }
      }
    }, this.windowSizeMs);
  }
}
// not that reliable, but best we can do
const isRoomId = (id: string) => id.length === UUID_LENGTH;
