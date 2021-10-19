import { Room } from 'matrix-js-sdk';

export class MatrixRoom extends Room {
  receiverCommunicationsID? = '';
  isDirect? = false;
}

export class MatrixRoomChunk {
  room_id!: string;
}
