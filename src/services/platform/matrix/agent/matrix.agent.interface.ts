import { MatrixEventDispatcher } from '../events/matrix.event.dispatcher';
import { MatrixClient } from '../types/matrix.client.type';

export interface IMatrixAgent {
  matrixClient: MatrixClient;
  eventDispatcher: MatrixEventDispatcher;
}
