import { LogContext } from '@common/enums';
import { SubscriptionType } from '@common/enums/subscription.type';
import { SUBSCRIPTION_PUB_SUB } from '@core/microservices/microservices.module';
import { Disposable } from '@interfaces/disposable.interface';
import { Inject, LoggerService } from '@nestjs/common';
import {
  autoAcceptRoomGuardFactory,
  AutoAcceptRoomMembershipMonitorFactory,
  AutoAcceptSpecificRoomMembershipMonitorFactory,
  RoomMonitorFactory,
  RoomTimelineMonitorFactory,
} from '@services/platform/matrix/events/matrix.event.adapter.room';
import { AutoAcceptGroupMembershipMonitorFactory } from '@src/services/platform/matrix/events/matrix.event.adapter.group';
import {
  IConditionalMatrixEventHandler,
  IMatrixEventHandler,
  MatrixEventDispatcher,
} from '@src/services/platform/matrix/events/matrix.event.dispatcher';
import { PubSubEngine } from 'graphql-subscriptions';
import { MatrixMessageAdapter } from '../adapter-message/matrix.message.adapter';
import { MatrixRoomAdapter } from '../adapter-room/matrix.room.adapter';
import { MatrixClient } from '../types/matrix.client.type';
import { IMatrixAgent } from './matrix.agent.interface';

export type MatrixAgentStartOptions = {
  registerTimelineMonitor?: boolean;
  registerRoomMonitor?: boolean;
  registerRoomMembershipMonitor?: boolean;
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
    @Inject(SUBSCRIPTION_PUB_SUB)
    private readonly subscriptionHandler: PubSubEngine,
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
      // handle room membership externally
      registerRoomMembershipMonitor = false,
      registerGroupMembershipMonitor = true,
      registerRoomMonitor = true,
      registerTimelineMonitor = true,
    }: MatrixAgentStartOptions = {
      registerRoomMembershipMonitor: false,
      registerGroupMembershipMonitor: true,
      registerRoomMonitor: true,
      registerTimelineMonitor: true,
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

    if (registerRoomMembershipMonitor) {
      eventHandler['roomMemberMembershipMonitor'] =
        this.resolveRoomMembershipMonitor();
    }

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

  resolveRoomMembershipMonitor(
    onComplete?: () => void,
    onError?: (message: string) => void
  ) {
    return AutoAcceptRoomMembershipMonitorFactory.create(
      this.matrixClient,
      this.roomAdapter,
      this.logger,
      onComplete,
      onError
    );
  }

  resolveSpecificRoomMembershipMonitor(
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

  resolveSpecificRoomMembershipOneTimeMonitor(
    roomId: string,
    userId: string,
    onRoomJoined: () => void,
    onComplete?: () => void,
    onError?: (message: string) => void
  ) {
    return {
      observer: this.resolveSpecificRoomMembershipMonitor(
        roomId,
        onRoomJoined,
        onComplete,
        onError
      ),
      condition: autoAcceptRoomGuardFactory(userId, roomId),
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
          `Publishing message: ${messageReceivedEvent.message.message}`,
          LogContext.COMMUNICATION
        );
        /* TODO - need to find a way to wire the admin user (with simplicity in mind)
          in order to be able to read community data */
        this.subscriptionHandler.publish(
          SubscriptionType.COMMUNICATION_MESSAGE_RECEIVED,
          messageReceivedEvent
        );
        this.logger.verbose?.(
          `Published message: ${messageReceivedEvent.message.message}`,
          LogContext.COMMUNICATION
        );
      }
    );
  }

  resolveRoomEventHandler() {
    return RoomMonitorFactory.create(message => {
      this.subscriptionHandler.publish(
        SubscriptionType.COMMUNICATION_ROOM_JOINED,
        message
      );
    });
  }

  dispose() {
    this.matrixClient.stopClient();
    this.eventDispatcher.dispose.bind(this.eventDispatcher)();
  }
}
