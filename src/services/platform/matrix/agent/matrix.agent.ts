import { SubscriptionType } from '@common/enums/subscription.type';
import { Disposable } from '@interfaces/disposable.interface';
import { Inject, LoggerService } from '@nestjs/common';
import {
  AutoAcceptRoomMembershipMonitorFactory,
  RoomMonitorFactory,
  RoomTimelineMonitorFactory,
} from '@services/platform/matrix/events/matrix.event.adapter.room';
import { PUB_SUB } from '@services/platform/subscription/subscription.module';
import { AutoAcceptGroupMembershipMonitorFactory } from '@src/services/platform/matrix/events/matrix.event.adapter.group';
import {
  IMatrixEventHandler,
  MatrixEventDispatcher,
} from '@src/services/platform/matrix/events/matrix.event.dispatcher';
import { MatrixRoomAdapterService } from '../adapter-room/matrix.room.adapter.service';
import { MatrixClient } from '../types/matrix.client.type';
import { IMatrixAgent } from './matrix.agent.interface';
import { PubSubEngine } from 'graphql-subscriptions';
import { MatrixMessageAdapterService } from '../adapter-message/matrix.message.adapter.service';
import { LogContext } from '@common/enums';

export type MatrixAgentStartOptions = {
  registerTimelineMonitor?: boolean;
  registerRoomMonitor?: boolean;
  registerMembershipMonitor?: boolean;
};

// Wraps an instance of the client sdk
export class MatrixAgent implements IMatrixAgent, Disposable {
  matrixClient: MatrixClient;
  eventDispatcher: MatrixEventDispatcher;
  roomAdapterService: MatrixRoomAdapterService;
  messageAdapterService: MatrixMessageAdapterService;

  constructor(
    matrixClient: MatrixClient,
    roomAdapterService: MatrixRoomAdapterService,
    messageAdapterService: MatrixMessageAdapterService,
    @Inject(PUB_SUB)
    private readonly subscriptionHandler: PubSubEngine,
    private loggerService: LoggerService
  ) {
    this.matrixClient = matrixClient;
    this.eventDispatcher = new MatrixEventDispatcher(this.matrixClient);
    this.roomAdapterService = roomAdapterService;
    this.messageAdapterService = messageAdapterService;
  }

  attach(handler: IMatrixEventHandler) {
    this.eventDispatcher.attach(handler);
  }

  detach(id: string) {
    this.eventDispatcher.detach(id);
  }

  async start(
    {
      registerMembershipMonitor = true,
      registerRoomMonitor = true,
      registerTimelineMonitor = true,
    }: MatrixAgentStartOptions = {
      registerMembershipMonitor: true,
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

    if (registerMembershipMonitor) {
      eventHandler['roomMemberMembershipMonitor'] =
        this.resolveRoomMembershipMonitor();
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

  resolveRoomMembershipMonitor() {
    return AutoAcceptRoomMembershipMonitorFactory.create(
      this.matrixClient,
      this.roomAdapterService
    );
  }

  resolveGroupMembershipMonitor() {
    return AutoAcceptGroupMembershipMonitorFactory.create(
      this.matrixClient,
      this.loggerService
    );
  }

  resolveRoomTimelineEventHandler() {
    return RoomTimelineMonitorFactory.create(
      this.matrixClient,
      this.messageAdapterService,
      this.loggerService,
      messageReceivedEvent => {
        this.loggerService.verbose?.(
          `Publishing message: ${messageReceivedEvent.message.message}`,
          LogContext.COMMUNICATION
        );
        /* TODO - need to find a way to wire the admin user (with simplicity in mind)
          in order to be able to read community data */
        this.subscriptionHandler.publish(
          SubscriptionType.COMMUNICATION_MESSAGE_RECEIVED,
          messageReceivedEvent
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
