import { Disposable } from '@interfaces/disposable.interface';
import {
  IMatrixEventHandler,
  MatrixEventDispatcher,
} from '@src/services/platform/matrix/events/matrix.event.dispatcher';
import { AutoAcceptGroupMembershipMonitorFactory } from '@src/services/platform/matrix/events/matrix.event.adapter.group';
import { AutoAcceptRoomMembershipMonitorFactory } from '@src/services/platform/matrix/events/matrix.event.adpater.room';
import { MatrixGroupEntityAdapter } from '@src/services/platform/matrix/adapter/matrix.adapter.group';
import { MatrixRoomEntityAdapter } from '@src/services/platform/matrix/adapter/matrix.adapter.room';
import { IMatrixAgent } from '@src/services/platform/matrix/agent-pool/matrix.agent.interface';
import { MatrixClient } from '../types/matrix.client.type';

export class MatrixAgent implements IMatrixAgent, Disposable {
  matrixClient: MatrixClient;
  roomEntityAdapter: MatrixRoomEntityAdapter;
  groupEntityAdapter: MatrixGroupEntityAdapter;
  eventDispatcher: MatrixEventDispatcher;

  constructor(matrixClient: MatrixClient) {
    this.matrixClient = matrixClient;
    this.roomEntityAdapter = new MatrixRoomEntityAdapter(this.matrixClient);
    this.groupEntityAdapter = new MatrixGroupEntityAdapter(this.matrixClient);
    this.eventDispatcher = new MatrixEventDispatcher(this.matrixClient);
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
        this.roomEntityAdapter
      ),
      groupMyMembershipMonitor: AutoAcceptGroupMembershipMonitorFactory.create(
        this.matrixClient
      ),
    });

    await this.matrixClient.startClient();

    return await startComplete;
  }

  dispose() {
    this.matrixClient.stopClient();
    this.eventDispatcher.dispose();
  }
}
