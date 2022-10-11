import { LogContext } from '@common/enums';
import { Disposable } from '@interfaces/disposable.interface';
import { LoggerService } from '@nestjs/common';
import {
  autoAcceptRoomGuardFactory,
  AutoAcceptSpecificRoomMembershipMonitorFactory,
  ForgetRoomMembershipMonitorFactory,
  roomMembershipLeaveGuardFactory,
  RoomMonitorFactory,
  RoomTimelineMonitorFactory,
} from '@services/external/matrix/events/matrix.event.adapter.room';
import { AutoAcceptGroupMembershipMonitorFactory } from '@services/external/matrix/events/matrix.event.adapter.group';
import {
  IConditionalMatrixEventHandler,
  IMatrixEventHandler,
  MatrixEventDispatcher,
} from '@services/external/matrix/events/matrix.event.dispatcher';
import { MatrixMessageAdapter } from '../adapter-message/matrix.message.adapter';
import { MatrixRoomAdapter } from '../adapter-room/matrix.room.adapter';
import { MatrixClient } from '../types/matrix.client.type';
import { IMatrixAgent } from './matrix.agent.interface';

export type MatrixAgentStartOptions = {
  registerTimelineMonitor?: boolean;
  registerRoomMonitor?: boolean;
  registerGroupMembershipMonitor?: boolean;
};

// Wraps an instance of the client sdk
export class MatrixAgent implements IMatrixAgent, Disposable {
  matrixClient: MatrixClient;
  eventDispatcher: MatrixEventDispatcher;
  roomAdapter: MatrixRoomAdapter;
  messageAdapter: MatrixMessageAdapter;

  constructor(
    matrixClient: MatrixClient,
    roomAdapter: MatrixRoomAdapter,
    messageAdapter: MatrixMessageAdapter,
    private logger: LoggerService
  ) {
    this.matrixClient = matrixClient;
    this.eventDispatcher = new MatrixEventDispatcher(this.matrixClient);
    this.roomAdapter = roomAdapter;
    this.messageAdapter = messageAdapter;
  }

  attach(handler: IMatrixEventHandler) {
    this.eventDispatcher.attach(handler);
  }

  attachOnceConditional(handler: IConditionalMatrixEventHandler) {
    this.eventDispatcher.attachOnceConditional(handler);
  }

  detach(id: string) {
    this.eventDispatcher.detach(id);
  }

  async start(
    {
      registerGroupMembershipMonitor = true,
      registerRoomMonitor = true,
      registerTimelineMonitor = false,
    }: MatrixAgentStartOptions = {
      registerGroupMembershipMonitor: true,
      registerRoomMonitor: true,
      registerTimelineMonitor: false,
    }
  ) {
    const startComplete = new Promise<void>((resolve, reject) => {
      const subscription = this.eventDispatcher.syncMonitor.subscribe(
        ({ oldSyncState, syncState }) => {
          if (syncState === 'SYNCING' && oldSyncState !== 'SYNCING') {
            subscription.unsubscribe();
            resolve();
          } else if (syncState === 'ERROR') {
            reject();
          }
        }
      );
    });

    await this.matrixClient.startClient({});
    await startComplete;

    const eventHandler: IMatrixEventHandler = {
      id: 'root',
    };

    if (registerGroupMembershipMonitor) {
      eventHandler['groupMyMembershipMonitor'] =
        this.resolveGroupMembershipMonitor();
    }

    if (registerTimelineMonitor) {
      eventHandler['roomTimelineMonitor'] =
        this.resolveRoomTimelineEventHandler();
    }

    if (registerRoomMonitor) {
      eventHandler['roomMonitor'] = this.resolveRoomEventHandler();
    }

    this.attach(eventHandler);
  }

  resolveAutoAcceptRoomMembershipMonitor(
    roomId: string,
    onRoomJoined: () => void,
    onComplete?: () => void,
    onError?: (message: string) => void
  ) {
    return AutoAcceptSpecificRoomMembershipMonitorFactory.create(
      this.matrixClient,
      this.roomAdapter,
      this.logger,
      roomId,
      onRoomJoined,
      onComplete,
      onError
    );
  }

  resolveAutoForgetRoomMembershipMonitor(
    onRoomJoined: () => void,
    onComplete?: () => void,
    onError?: (message: string) => void
  ) {
    return ForgetRoomMembershipMonitorFactory.create(
      this.matrixClient,
      this.logger,
      onRoomJoined,
      onComplete,
      onError
    );
  }

  resolveAutoAcceptRoomMembershipOneTimeMonitor(
    roomId: string,
    userId: string,
    onRoomJoined: () => void,
    onComplete?: () => void,
    onError?: (message: string) => void
  ) {
    return {
      observer: this.resolveAutoAcceptRoomMembershipMonitor(
        roomId,
        onRoomJoined,
        onComplete,
        onError
      ),
      condition: autoAcceptRoomGuardFactory(userId, roomId),
    };
  }

  resolveForgetRoomMembershipOneTimeMonitor(
    roomId: string,
    userId: string,
    onRoomLeft: () => void,
    onComplete?: () => void,
    onError?: (message: string) => void
  ) {
    return {
      observer: this.resolveAutoForgetRoomMembershipMonitor(
        onRoomLeft,
        onComplete,
        onError
      ),
      condition: roomMembershipLeaveGuardFactory(userId, roomId),
    };
  }

  resolveGroupMembershipMonitor() {
    return AutoAcceptGroupMembershipMonitorFactory.create(
      this.matrixClient,
      this.logger
    );
  }

  resolveRoomTimelineEventHandler() {
    return RoomTimelineMonitorFactory.create(
      this.matrixClient,
      this.messageAdapter,
      this.logger,
      messageReceivedEvent => {
        this.logger.verbose?.(
          `Room timeline received message: ${messageReceivedEvent.message.message}`,
          LogContext.COMMUNICATION
        );
      }
    );
  }

  resolveRoomEventHandler() {
    return RoomMonitorFactory.create(message => {
      this.logger.verbose?.(
        `Room joined: ${message}`,
        LogContext.COMMUNICATION
      );
    });
  }

  dispose() {
    this.matrixClient.stopClient();
    this.eventDispatcher.dispose.bind(this.eventDispatcher)();
  }
}
