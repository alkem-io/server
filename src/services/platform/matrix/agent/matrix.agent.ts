import { Disposable } from '@interfaces/disposable.interface';
import {
  IMatrixEventHandler,
  MatrixEventDispatcher,
} from '@src/services/platform/matrix/events/matrix.event.dispatcher';
import { AutoAcceptGroupMembershipMonitorFactory } from '@src/services/platform/matrix/events/matrix.event.adapter.group';
import {
  AutoAcceptRoomMembershipMonitorFactory,
  RoomMonitorFactory,
  RoomTimelineMonitorFactory,
} from '@src/services/platform/matrix/events/matrix.event.adpater.room';
import { MatrixClient } from '../types/matrix.client.type';
import { MatrixRoomAdapterService } from '../adapter-room/matrix.room.adapter.service';
import { IMatrixAgent } from './matrix.agent.interface';
import { Inject, LoggerService } from '@nestjs/common';
import { MatrixUserAdapterService } from '../adapter-user/matrix.user.adapter.service';
import { PubSubEngine } from 'graphql-subscriptions';
import { PUB_SUB } from '@services/platform/subscription/subscription.module';
import {
  COMMUNICATION_MESSAGE_RECEIVED,
  MATRIX_ROOM_JOINED,
} from '@services/platform/subscription/subscription.events';

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
    private readonly subscriptionHandler: PubSubEngine,
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

  async start() {
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

    this.attach({
      id: 'root',
      roomMemberMembershipMonitor: this.resolveRoomMembershipMonitor(),
      groupMyMembershipMonitor: this.resolveGroupMembershipMonitor(),
      roomTimelineMonitor: this.resolveRoomTimelineEventHandler(),
      roomMonitor: this.resolveRoomEventHandler(),
    });

    await this.matrixClient.startClient({});

    return await startComplete;
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
        this.subscriptionHandler.publish(
          COMMUNICATION_MESSAGE_RECEIVED,
          message
        );
      }
    );
  }

  resolveRoomEventHandler() {
    return RoomMonitorFactory.create(message => {
      this.subscriptionHandler.publish(MATRIX_ROOM_JOINED, message);
    });
  }

  dispose() {
    this.matrixClient.stopClient();
    this.eventDispatcher.dispose();
  }
}
