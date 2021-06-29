import { MatrixGroupEntityAdapter, MatrixRoomEntityAdapter } from '../adapter';
import { MatrixEventDispatcher } from '../events/matrix.event.dispatcher';
import { MatrixClient } from './matrix.client.types';

export interface IMessageRequest {
  text: string;
}

export interface ICommunityMessageRequest extends IMessageRequest {
  communityId: string;
}

export interface IInitiateDirectMessageRequest {
  email: string;
}

export interface IResponseMessage {
  originServerTimestamp: number;
  body: string;
}

export interface IMatrixAgent {
  matrixClient: MatrixClient;
  roomEntityAdapter: MatrixRoomEntityAdapter;
  groupEntityAdapter: MatrixGroupEntityAdapter;
  eventDispatcher: MatrixEventDispatcher;
}
