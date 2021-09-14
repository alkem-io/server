import { Disposable } from '@interfaces/disposable.interface';
import { Inject, LoggerService } from '@nestjs/common';
import {
  AutoAcceptRoomMembershipMonitorFactory,
  RoomMonitorFactory,
  RoomTimelineMonitorFactory,
} from '@services/platform/matrix/events/matrix.event.adapter.room';
import { SubscriptionEvents } from '@services/platform/subscription/subscription.events';
import { PUB_SUB } from '@services/platform/subscription/subscription.module';
import { AutoAcceptGroupMembershipMonitorFactory } from '@src/services/platform/matrix/events/matrix.event.adapter.group';
import {
  IMatrixEventHandler,
  MatrixEventDispatcher,
} from '@src/services/platform/matrix/events/matrix.event.dispatcher';
import { PubSub } from 'graphql-subscriptions';
import { MatrixRoomAdapterService } from '../adapter-room/matrix.room.adapter.service';
import { MatrixUserAdapterService } from '../adapter-user/matrix.user.adapter.service';
import { MatrixClient } from '../types/matrix.client.type';
import { IMatrixAgent } from './matrix.agent.interface';

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

  constructor(
    matrixClient: MatrixClient,
    roomAdapterService: MatrixRoomAdapterService,
    private matrixUserAdapterService: MatrixUserAdapterService,
    @Inject(PUB_SUB)
    private readonly subscriptionHandler: PubSub,
    private loggerService: LoggerService
  ) {
    this.matrixClient = matrixClient;
    this.eventDispatcher = new MatrixEventDispatcher(this.matrixClient);
    this.roomAdapterService = roomAdapterService;
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
      this.matrixUserAdapterService,
      message => {
        /* TODO - need to find a way to wire the admin user (with simplicity in mind)
          in order to be able to read community data */
        this.subscriptionHandler.publish(
          SubscriptionEvents.COMMUNICATION_MESSAGE_RECEIVED,
          message
        );
      }
    );
  }

  resolveRoomEventHandler() {
    return RoomMonitorFactory.create(message => {
      this.subscriptionHandler.publish(
        SubscriptionEvents.MATRIX_ROOM_JOINED,
        message
      );
    });
  }

  dispose() {
    this.matrixClient.stopClient();
    this.eventDispatcher.dispose.bind(this.eventDispatcher)();
  }
}
