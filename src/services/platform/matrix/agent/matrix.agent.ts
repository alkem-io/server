import { Disposable } from '@interfaces/disposable.interface';
import {
  IMatrixEventHandler,
  MatrixEventDispatcher,
} from '@src/services/platform/matrix/events/matrix.event.dispatcher';
import { AutoAcceptGroupMembershipMonitorFactory } from '@src/services/platform/matrix/events/matrix.event.adapter.group';
import { AutoAcceptRoomMembershipMonitorFactory } from '@src/services/platform/matrix/events/matrix.event.adpater.room';
import { MatrixClient } from '../types/matrix.client.type';
import { MatrixRoomAdapterService } from '../adapter-room/matrix.room.adapter.service';
import { IMatrixAgent } from './matrix.agent.interface';

// Wraps an instance of the client sdk
export class MatrixAgent implements IMatrixAgent, Disposable {
  matrixClient: MatrixClient;
  eventDispatcher: MatrixEventDispatcher;
  roomAdapterService: MatrixRoomAdapterService;

  constructor(
    matrixClient: MatrixClient,
    roomAdapterService: MatrixRoomAdapterService
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
      roomMemberMembershipMonitor: AutoAcceptRoomMembershipMonitorFactory.create(
        this.matrixClient,
        this.roomAdapterService
      ),
      groupMyMembershipMonitor: AutoAcceptGroupMembershipMonitorFactory.create(
        this.matrixClient
      ),
    });

    await this.matrixClient.startClient({});

    return await startComplete;
  }

  dispose() {
    this.matrixClient.stopClient();
    this.eventDispatcher.dispose();
  }
}
