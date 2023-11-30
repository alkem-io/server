import { clearInterval, setInterval, setTimeout } from 'timers';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Configuration, FrontendApi } from '@ory/kratos-client';
import {
  Inject,
  Injectable,
  LoggerService,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { EXCALIDRAW_SERVER, UUID_LENGTH } from '@common/constants';
import { arrayRandomElement } from '@common/utils';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WhiteboardRtService } from '@domain/common/whiteboard-rt';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import {
  closeConnection,
  disconnectEventHandler,
  disconnectingEventHandler,
  joinRoomEventHandler,
  serverBroadcastEventHandler,
  serverVolatileBroadcastEventHandler,
  checkSessionHandler,
} from './utils';
import {
  CONNECTION,
  DISCONNECT,
  DISCONNECTING,
  INIT_ROOM,
  JOIN_ROOM,
  SERVER_BROADCAST,
  SERVER_VOLATILE_BROADCAST,
  SERVER_SAVE_REQUEST,
  SocketIoServer,
  RemoteSocketIoSocket,
} from './types';
import { CREATE_ROOM, DELETE_ROOM } from './adapters/adapter.event.names';
import {
  attachSessionMiddleware,
  attachAgentMiddleware,
  checkSessionMiddleware,
} from './middlewares';

type SaveMessageOpts = { maxRetries: number; timeout: number };
type RoomTimers = Map<string, NodeJS.Timer | NodeJS.Timeout>;
type SaveResponse = { success: boolean; errors?: string[] };

const defaultContributionInterval = 600;
const defaultSaveInterval = 15;
const defaultSaveTimeout = 10;
const defaultMaxRetries = 5;
const defaultTimeoutBeforeRetryMs = 3000;

@Injectable()
export class ExcalidrawServer {
  private readonly contributionTimers: RoomTimers = new Map();
  private readonly saveTimers: RoomTimers = new Map();

  private readonly contributionWindowMs: number;
  private readonly saveIntervalMs: number;
  private readonly saveTimeoutMs: number;
  private readonly saveMaxRetries: number;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    @Inject(EXCALIDRAW_SERVER) private wsServer: SocketIoServer,
    private configService: ConfigService,
    private authService: AuthenticationService,
    private authorizationService: AuthorizationService,
    private whiteboardRtService: WhiteboardRtService,
    private contributionReporter: ContributionReporterService,
    private communityResolver: CommunityResolverService
  ) {
    const {
      contribution_window,
      save_interval,
      save_timeout,
      save_max_retries,
    } = this.configService.get(ConfigurationTypes.COLLABORATION)?.whiteboards;

    this.contributionWindowMs =
      (contribution_window ?? defaultContributionInterval) * 1000;
    this.saveIntervalMs = (save_interval ?? defaultSaveInterval) * 1000;
    this.saveTimeoutMs = (save_timeout ?? defaultSaveTimeout) * 1000;
    this.saveMaxRetries = Number(save_max_retries ?? defaultMaxRetries);
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
    adapter.on(CREATE_ROOM, async (roomId: string) => {
      if (!isRoomId(roomId)) {
        return;
      }
      if ((await this.wsServer.in(roomId).fetchSockets()).length > 0) {
        // if there are sockets already connected
        // this room was created elsewhere
        return;
      }
      this.logger.verbose?.(
        `Room created: '${roomId}'`,
        LogContext.EXCALIDRAW_SERVER
      );
      const contributionTimer = this.contributionTimers.get(roomId);
      if (!contributionTimer) {
        this.logger.verbose?.(
          `Starting contribution timer for room '${roomId}'`,
          LogContext.EXCALIDRAW_SERVER
        );
        const timer = this.startContributionEventTimer(roomId);
        this.contributionTimers.set(roomId, timer);
      }

      const saveTimer = this.saveTimers.get(roomId);
      if (!saveTimer) {
        this.logger.verbose?.(
          `Starting auto save timer for room '${roomId}'`,
          LogContext.EXCALIDRAW_SERVER
        );
        const timer = this.startSaveTimer(roomId);
        this.saveTimers.set(roomId, timer);
      }
    });
    adapter.on(DELETE_ROOM, async (roomId: string) => {
      if (!isRoomId(roomId)) {
        return;
      }

      if ((await this.wsServer.in(roomId).fetchSockets()).length > 0) {
        // if there are sockets already connected
        // this room was created elsewhere
        return;
      }

      this.logger.verbose?.(
        `Room deleted: '${roomId}`,
        LogContext.EXCALIDRAW_SERVER
      );

      const contributionTimer = this.contributionTimers.get(roomId);
      clearInterval(contributionTimer);
      this.contributionTimers.delete(roomId);

      const saveTimer = this.saveTimers.get(roomId);
      clearInterval(saveTimer);
      this.saveTimers.delete(roomId);
    });

    this.wsServer.use(attachSessionMiddleware(kratosClient));
    this.wsServer.use(
      attachAgentMiddleware(kratosClient, this.logger, this.authService)
    );

    this.wsServer.on(CONNECTION, async socket => {
      // drop connection on invalid or expired session
      socket.prependAny(() => checkSessionHandler(socket));
      socket.use((_, next) => checkSessionMiddleware(socket, next));
      socket.on('error', err => {
        if (!err) {
          return;
        }

        this.logger.error(err.message, err.stack, LogContext.EXCALIDRAW_SERVER);

        if (err && err instanceof UnauthorizedException) {
          closeConnection(socket, err.message);
        }
      });

      this.logger?.verbose?.(
        `User '${socket.data.agentInfo.userID}' established connection`,
        LogContext.EXCALIDRAW_SERVER
      );

      this.wsServer.to(socket.id).emit(INIT_ROOM);
      // client events ONLY
      socket.on(
        JOIN_ROOM,
        async (roomID: string) =>
          await joinRoomEventHandler(
            roomID,
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
          await disconnectingEventHandler(this.wsServer, socket, this.logger)
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
      const saved = await this.sendSaveMessage(roomId, {
        maxRetries: this.saveMaxRetries,
        timeout: this.saveTimeoutMs,
      });

      if (saved) {
        this.logger.verbose?.(
          `Saving '${roomId}' successful`,
          LogContext.EXCALIDRAW_SERVER
        );
      } else {
        this.logger.error(
          `Saving '${roomId}' failed`,
          undefined,
          LogContext.EXCALIDRAW_SERVER
        );
      }

      timer.refresh();
    }, this.saveIntervalMs);
    return timer;
  }

  /***
   * Sends save requests to a random sockets until it's successful after a fixed set of retries
   *
   * @param roomId The room that needs saving
   * @param opts Save options
   */
  private async sendSaveMessage(
    roomId: string,
    opts: SaveMessageOpts
  ): Promise<boolean> {
    return this._sendSaveMessage(roomId, 0, opts);
  }

  private async _sendSaveMessage(
    roomId: string,
    retries: number,
    opts: SaveMessageOpts
  ): Promise<boolean> {
    const { maxRetries, timeout } = opts;
    if (retries === maxRetries) {
      return false;
    }
    if (retries > 0) {
      this.logger.warn?.(
        `Retrying to save [${retries}/${maxRetries}]`,
        LogContext.EXCALIDRAW_SERVER
      );
    }
    // get only sockets which can save
    const sockets = (await this.wsServer.in(roomId).fetchSockets()).filter(
      socket => !socket.data.readonly
    );
    // return if no eligible sockets
    if (!sockets.length) {
      return false;
    }
    // choose a random socket which can save
    const randomSocket = arrayRandomElement(sockets);
    // sends a save request to the socket and wait for a response
    try {
      const [response]: SaveResponse[] = await this.wsServer
        .to(randomSocket.id)
        .timeout(timeout)
        .emitWithAck(SERVER_SAVE_REQUEST);
      // log the response
      this.logResponse(response, randomSocket, roomId);
      // if failed - repeat
      if (!response.success) {
        // workaround for timers/promises not working
        return new Promise(res =>
          setTimeout(
            async () =>
              res(await this._sendSaveMessage(roomId, ++retries, opts)),
            defaultTimeoutBeforeRetryMs
          )
        );
      }
      // if successful - stop and return
      return true;
    } catch (e) {
      this.logger.verbose?.(
        `User '${randomSocket.data.agentInfo.userID}' did not respond to '${SERVER_SAVE_REQUEST}' event after ${timeout}ms`,
        LogContext.EXCALIDRAW_SERVER
      );
      //retry if timed out
      return await this._sendSaveMessage(roomId, ++retries, opts);
    }
  }

  private logResponse(
    response: SaveResponse,
    socket: RemoteSocketIoSocket,
    roomId: string
  ) {
    if (!response.success) {
      this.logger.error(
        `User ${
          socket.data.agentInfo.userID
        } failed to save whiteboard '${roomId}': ${response.errors?.join(
          '; '
        )}`,
        undefined,
        LogContext.EXCALIDRAW_SERVER
      );
    } else if (response.errors) {
      this.logger.warn(
        `User '${
          socket.data.agentInfo.userID
        }' saved Whiteboard '${roomId}' with some errors: ${response.errors?.join(
          ';'
        )}'`,
        LogContext.EXCALIDRAW_SERVER
      );
    }
  }
}
// not that reliable, but best we can do
const isRoomId = (id: string) => id.length === UUID_LENGTH;
