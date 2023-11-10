import { clearInterval, setInterval, setTimeout } from 'timers';
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
  SocketIoServer,
} from './types';
import {
  CREATE_ROOM,
  DELETE_ROOM,
} from '@services/external/excalidraw-backend/adapters/adapter.event.names';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { arrayRandomElement } from '@common/utils';

type RoomTimers = Map<string, NodeJS.Timer | NodeJS.Timeout>;

const defaultContributionInterval = 600;

const SERVER_SAVE_REQUEST = 'save-request';
const CLIENT_SAVE_SUCCESS = 'save-success';
const CLIENT_SAVE_FAIL = 'save-fail';
const CLIENT_SAVE_TIMEOUT = 10000; // todo
const SAVE_MAX_RETRIES = 5; // todo

@Injectable()
export class ExcalidrawServer {
  private readonly contributionTimers: RoomTimers = new Map();
  private readonly saveTimers: RoomTimers = new Map();

  private readonly contributionWindowMs: number;
  private readonly saveIntervalMs: number;

  constructor(
    @Inject(EXCALIDRAW_SERVER) private wsServer: SocketIoServer,
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
    const contributionInterval = this.configService.get(
      ConfigurationTypes.INTEGRATIONS
    )?.contributions.rt_window;

    this.contributionWindowMs =
      (contributionInterval ?? defaultContributionInterval) * 1000;
    this.saveIntervalMs = 5 * 1000; // todo
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

      const contributionTimer = this.contributionTimers.get(roomId);
      clearInterval(contributionTimer);
      this.contributionTimers.delete(roomId);

      const saveTimer = this.saveTimers.get(roomId);
      clearInterval(saveTimer);
      this.saveTimers.delete(roomId);
    });
    adapter.on(CREATE_ROOM, (roomId: string) => {
      if (!isRoomId(roomId)) {
        return;
      }
      const contributionTimer = this.contributionTimers.get(roomId);
      if (!contributionTimer) {
        const timer = this.startContributionEventTimer(roomId);
        this.contributionTimers.set(roomId, timer);
      }

      const saveTimer = this.saveTimers.get(roomId);
      if (!saveTimer) {
        this.logger.verbose?.(`Starting timer for room '${roomId}'`);
        const timer = this.startSaveTimer(roomId);
        this.saveTimers.set(roomId, timer);
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

      socket.data.agentInfo = agentInfo;

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
    return setInterval(
      async () => await this.gatherContributions(roomId),
      this.contributionWindowMs
    );
  }

  private async gatherContributions(roomId: string) {
    const windowEnd = Date.now();
    const windowStart = windowEnd - this.contributionWindowMs;

    const { spaceID } =
      await this.communityResolver.getCommunityFromWhiteboardRtOrFail(roomId);
    const wb = await this.whiteboardRtService.getProfile(roomId);

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
  }

  private startSaveTimer(roomId: string) {
    const timer = setTimeout(async () => {
      const saved = await this.sendSaveMessage(roomId);

      if (saved) {
      }
      timer.refresh();
    }, this.saveIntervalMs);
    return timer;
  }

  /***
   * Sends save requests to random sockets until it's successful.
   * Retries indefinitely
   * @param roomId The room that needs saving
   * @param retries
   */
  // todo: return type
  private async sendSaveMessage(roomId: string, retries = 0): Promise<boolean> {
    if (retries === SAVE_MAX_RETRIES) {
      return false;
    }
    // get only sockets which can save
    const sockets = (await this.wsServer.in(roomId).fetchSockets()).filter(
      socket => !socket.data.readonly
    );
    const randomSocket = arrayRandomElement(sockets);
    try {
      // todo: response type
      const response = await this.wsServer
        .to(randomSocket.id)
        .timeout(CLIENT_SAVE_TIMEOUT)
        .emitWithAck(SERVER_SAVE_REQUEST);

      this.logger.verbose?.(
        `Received ${JSON.stringify(response)} from '${randomSocket.id}'`
      );

      if (response.success) {
        return true;
      }

      return this.sendSaveMessage(roomId, ++retries);
    } catch (e) {
      this.logger.verbose?.(
        `Client '${randomSocket.data.agentInfo.userID}' did not respond to '${SERVER_SAVE_REQUEST}' event after ${CLIENT_SAVE_TIMEOUT}ms`,
        LogContext.EXCALIDRAW_SERVER
      );
      return this.sendSaveMessage(roomId, ++retries);
    }
  }
}
// not that reliable, but best we can do
const isRoomId = (id: string) => id.length === UUID_LENGTH;
