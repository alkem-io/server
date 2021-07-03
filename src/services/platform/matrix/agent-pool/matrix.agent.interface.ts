import { MatrixEventDispatcher } from '../events/matrix.event.dispatcher';
import { MatrixClient } from '../types/matrix.client.type';

export interface IMessageRequest {
  text: string;
}

export interface ICommunityMessageRequest extends IMessageRequest {
  communityId: string;
}

export interface IInitiateDirectMessageRequest {
  email: string;
}

export interface IMatrixAgent {
  matrixClient: MatrixClient;
  eventDispatcher: MatrixEventDispatcher;
}
