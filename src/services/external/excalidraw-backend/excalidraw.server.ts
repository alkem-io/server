import { setInterval } from 'timers';
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
import { APP_ID, EXCALIDRAW_SERVER, UUID_LENGTH } from '@common/constants';
import { arrayRandomElement } from '@common/utils';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WhiteboardService } from '@domain/common/whiteboard';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import {
  closeConnection,
  disconnectEventHandler,
  disconnectingEventHandler,
  serverBroadcastEventHandler,
  authorizeWithRoomAndJoinHandler,
  serverVolatileBroadcastEventHandler,
  checkSessionHandler,
  idleStateEventHandler,
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
  SERVER_SIDE_ROOM_DELETED,
  SAVED,
  IDLE_STATE,
  SocketIoSocket,
  COLLABORATOR_MODE,
} from './types';
import { CREATE_ROOM, DELETE_ROOM } from './adapters/adapter.event.names';
import {
  attachSessionMiddleware,
  attachAgentMiddleware,
  checkSessionMiddleware,
  socketDataInitMiddleware,
} from './middlewares';
import { debounce } from 'lodash';

type SaveMessageOpts = { timeout: number };
type RoomTimers = Map<string, NodeJS.Timer>;
type SocketTimers = Map<string, NodeJS.Timer>;
type SaveResponse = { success: boolean; errors?: string[] };

const defaultContributionInterval = 600;
const defaultSaveInterval = 15;
const defaultSaveTimeout = 10;
const defaultCollaboratorModeTimeout = 60;

@Injectable()
export class ExcalidrawServer {
  private readonly contributionTimers: RoomTimers = new Map();
  private readonly saveTimers: RoomTimers = new Map();
  private readonly collaboratorModeTimers: SocketTimers = new Map();

  private readonly contributionWindowMs: number;
  private readonly saveIntervalMs: number;
  private readonly saveTimeoutMs: number;
  private readonly collaboratorModeTimeoutMs: number;

  constructor(
    @Inject(APP_ID) private appId: string,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    @Inject(EXCALIDRAW_SERVER) private wsServer: SocketIoServer,
    private configService: ConfigService,
    private authService: AuthenticationService,
    private authorizationService: AuthorizationService,
    private whiteboardService: WhiteboardService,
    private contributionReporter: ContributionReporterService,
    private communityResolver: CommunityResolverService
  ) {
    const {
      contribution_window,
      save_interval,
      save_timeout,
      collaborator_mode_timeout,
    } = this.configService.get(ConfigurationTypes.COLLABORATION)?.whiteboards;

    this.contributionWindowMs =
      (contribution_window ?? defaultContributionInterval) * 1000;
    this.saveIntervalMs = (save_interval ?? defaultSaveInterval) * 1000;
    this.saveTimeoutMs = (save_timeout ?? defaultSaveTimeout) * 1000;
    this.collaboratorModeTimeoutMs =
      (collaborator_mode_timeout ?? defaultCollaboratorModeTimeout) * 1000;
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
        // this room already exist on another instance
        return;
      }
      this.logger.verbose?.(
        `Room '${roomId}' created on instance '${this.appId}'`,
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

      const connectedSocketsToRoomCount = (
        await this.wsServer.in(roomId).fetchSockets()
      ).length;
      if (connectedSocketsToRoomCount > 0) {
        // if there are sockets already connected
        // this room was deleted, but it's still active on the other instances
        // so do nothing here
        this.logger.verbose?.(
          `Room '${roomId}' deleted locally ('${this.appId}'), but ${connectedSocketsToRoomCount} sockets are still connected elsewhere`,
          LogContext.EXCALIDRAW_SERVER
        );
        return;
      }
      // send an event that the room is actually deleted everywhere,
      // because this was the last one
      this.wsServer.serverSideEmit(
        SERVER_SIDE_ROOM_DELETED,
        this.appId,
        roomId
      );

      this.logger.verbose?.(
        `Room '${roomId}' deleted locally and everywhere else - this was the final instance`,
        LogContext.EXCALIDRAW_SERVER
      );
      // delete timers that were left locally
      this.deleteTimersForRoom(roomId);
    });
    // middlewares
    this.wsServer.use(socketDataInitMiddleware);
    this.wsServer.use(attachSessionMiddleware(kratosClient));
    this.wsServer.use(
      attachAgentMiddleware(kratosClient, this.logger, this.authService)
    );
    // cluster communication
    this.wsServer.on(
      SERVER_SIDE_ROOM_DELETED,
      async (serverId: string, roomId: string) => {
        this.logger.verbose?.(
          `'${SERVER_SIDE_ROOM_DELETED}' received: 'Room '${roomId}' deleted in '${serverId}' instance. Room is finally deleted everywhere`,
          LogContext.EXCALIDRAW_SERVER
        );
        // clear any timers that were left locally,
        // because the room has not been deleted globally
        this.deleteTimersForRoom(roomId);
      }
    );
    // handlers
    this.wsServer.on(CONNECTION, async socket => {
      this.logger?.verbose?.(
        `User '${socket.data.agentInfo.userID}' established connection`,
        LogContext.EXCALIDRAW_SERVER
      );

      this.wsServer.to(socket.id).emit(INIT_ROOM);
      this.wsServer.to(socket.id).emit(COLLABORATOR_MODE, { mode: 'write' });

      this.startCollaboratorModeTimer(socket);

      // first authorize the user with the room
      socket.on(JOIN_ROOM, async (roomID: string) => {
        await authorizeWithRoomAndJoinHandler(
          roomID,
          socket,
          this.wsServer,
          this.whiteboardService,
          this.authorizationService,
          this.logger
        );
        if (socket.data.update) {
          // user can broadcast content change events
          socket.on(SERVER_BROADCAST, (roomID: string, data: ArrayBuffer) => {
            serverBroadcastEventHandler(roomID, data, socket);
            this.resetCollaboratorModeTimer(socket);
          });
        }
        this.logger.verbose?.(
          `User '${socket.data.agentInfo.userID}' update flag is '${socket.data.update}'`,
          LogContext.EXCALIDRAW_SERVER
        );
      });
      // attach session handlers
      // drop connection on invalid or expired session
      socket.prependAny(() => checkSessionHandler(socket));
      socket.use((_, next) => checkSessionMiddleware(socket, next));
      // attach error handlers
      socket.on('error', err => {
        if (!err) {
          return;
        }

        this.logger.error(err.message, err.stack, LogContext.EXCALIDRAW_SERVER);

        if (err && err instanceof UnauthorizedException) {
          closeConnection(socket, err.message);
        }
      });
      // attach socket handlers conditionally on authorization
      // client events ONLY
      // user can broadcast presence
      socket.on(
        SERVER_VOLATILE_BROADCAST,
        (roomID: string, data: ArrayBuffer) => {
          serverVolatileBroadcastEventHandler(roomID, data, socket);
          this.resetCollaboratorModeTimer(socket);
        }
      );

      socket.on(IDLE_STATE, (roomID: string, data: ArrayBuffer) =>
        idleStateEventHandler(roomID, data, socket)
      );

      socket.on(
        DISCONNECTING,
        async () =>
          await disconnectingEventHandler(this.wsServer, socket, this.logger)
      );
      socket.on(DISCONNECT, () => {
        disconnectEventHandler(socket);
        this.deleteCollaboratorModeTimerForSocket(socket.id);
      });
    });

    this.whiteboardService.EventEmitter.on('saved', async (roomID: string) => {
      this.logger.verbose?.(
        `Whiteboard '${roomID}' saved`,
        LogContext.EXCALIDRAW_SERVER
      );
      this.wsServer.to(roomID).emit(SAVED);
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
      await this.communityResolver.getCommunityFromWhiteboardOrFail(roomId);
    const wb = await this.whiteboardService.getProfile(roomId);

    const sockets = await this.wsServer.in(roomId).fetchSockets();

    for (const socket of sockets) {
      const lastContributed = socket.data.lastContributed;
      // was the last contribution in that window
      if (lastContributed >= windowStart && windowEnd >= lastContributed) {
        this.contributionReporter.whiteboardContribution(
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
    return setInterval(async () => {
      const saved = await this.sendSaveMessage(roomId, {
        timeout: this.saveTimeoutMs,
      });

      if (saved === undefined) {
        this.logger.verbose?.(
          `No eligible sockets found to save '${roomId}'.`,
          LogContext.EXCALIDRAW_SERVER
        );
      } else if (saved) {
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
    }, this.saveIntervalMs);
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
  ): Promise<boolean | undefined> {
    const { timeout } = opts;
    // get only sockets which can save
    const sockets = (await this.wsServer.in(roomId).fetchSockets()).filter(
      socket => socket.data.update
    );
    // return if no eligible sockets
    if (!sockets.length) {
      return undefined;
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
    } catch (e) {
      this.logger.error?.(
        `User '${randomSocket.data.agentInfo.userID}' did not respond to '${SERVER_SAVE_REQUEST}' event after ${timeout}ms`,
        LogContext.EXCALIDRAW_SERVER
      );
      return false;
    }

    return true;
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

  private deleteTimersForRoom(roomId: string) {
    const contributionTimer = this.contributionTimers.get(roomId);
    if (contributionTimer) {
      clearInterval(contributionTimer);
      this.contributionTimers.delete(roomId);

      this.logger.verbose?.(
        `Deleted contribution timer for room '${roomId}'`,
        LogContext.EXCALIDRAW_SERVER
      );
    }

    const saveTimer = this.saveTimers.get(roomId);
    if (saveTimer) {
      clearInterval(saveTimer);
      this.saveTimers.delete(roomId);
      this.logger.verbose?.(
        `Deleted auto save timer for room '${roomId}'`,
        LogContext.EXCALIDRAW_SERVER
      );
    }
  }

  private createCollaboratorModeTimer(socket: SocketIoSocket) {
    return setTimeout(async () => {
      this.logger.verbose?.(
        `Executing collaborator mode timer for socket '${socket.id}'`,
        LogContext.EXCALIDRAW_SERVER
      );
      this.wsServer.to(socket.id).emit(COLLABORATOR_MODE, { mode: 'read' });
      socket.removeAllListeners(SERVER_BROADCAST);
      socket.data.update = false;
      this.collaboratorModeTimers.delete(socket.id);
    }, this.collaboratorModeTimeoutMs);
  }

  private startCollaboratorModeTimer(socket: SocketIoSocket) {
    let timer = this.collaboratorModeTimers.get(socket.id);
    if (timer) {
      this.logger.verbose?.(
        `Collaborator mode timer for socket '${socket.id}' already exists`,
        LogContext.EXCALIDRAW_SERVER
      );
      return;
    }
    timer = this.createCollaboratorModeTimer(socket);
    this.collaboratorModeTimers.set(socket.id, timer);
    this.logger.verbose?.(
      `Created collaborator mode timer for socket '${socket.id}'`,
      LogContext.EXCALIDRAW_SERVER
    );
  }

  private resetCollaboratorModeTimer = debounce(
    (socket: SocketIoSocket) => {
      const timer = this.collaboratorModeTimers.get(socket.id);
      if (timer) {
        this.logger.verbose?.(
          `Reseting collaborator mode timer for socket '${socket.id}'`,
          LogContext.EXCALIDRAW_SERVER
        );

        this.deleteCollaboratorModeTimerForSocket(socket.id);
        this.startCollaboratorModeTimer(socket);
      }
    },
    500,
    { leading: true, trailing: false }
  );

  private deleteCollaboratorModeTimerForSocket(socketId: string) {
    const timer = this.collaboratorModeTimers.get(socketId);
    if (timer) {
      clearTimeout(timer);
      this.collaboratorModeTimers.delete(socketId);

      this.logger.verbose?.(
        `Deleted collaborator mode timer for socket '${socketId}'`,
        LogContext.EXCALIDRAW_SERVER
      );
    }
  }
}
// not that reliable, but best we can do
const isRoomId = (id: string) => id.length === UUID_LENGTH;
