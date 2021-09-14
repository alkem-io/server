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
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from '@services/platform/subscription/subscription.module';
import { SubscriptionEvents } from '@services/platform/subscription/subscription.events';
import { CommunicationMessageReceived } from '@services/platform/communication/communication.dto.message.received';

export type MatrixAgentMiddlewares = {
  roomTimelineMonitor?: (
    message: CommunicationMessageReceived
  ) => CommunicationMessageReceived;
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

  async start(middlewares?: MatrixAgentMiddlewares) {
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

    this.attach({
      id: 'root',
      roomMemberMembershipMonitor: this.resolveRoomMembershipMonitor(),
      groupMyMembershipMonitor: this.resolveGroupMembershipMonitor(),
      roomTimelineMonitor: this.resolveRoomTimelineEventHandler(
        middlewares?.roomTimelineMonitor
      ),
      roomMonitor: this.resolveRoomEventHandler(),
    });
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

  resolveRoomTimelineEventHandler(
    middleware?: (
      message: CommunicationMessageReceived
    ) => CommunicationMessageReceived
  ) {
    return RoomTimelineMonitorFactory.create(
      this.matrixClient,
      this.matrixUserAdapterService,
      message => {
        const updatedMessage = (middleware && middleware(message)) || message;
        this.subscriptionHandler.publish(
          SubscriptionEvents.COMMUNICATION_MESSAGE_RECEIVED,
          updatedMessage
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
