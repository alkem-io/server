import { MatrixEvent } from 'matrix-js-sdk';
export class MatrixRoomResponseMessage extends MatrixEvent {}

export type MatrixRoomResponseMessageSender = {
  name: string;
};
