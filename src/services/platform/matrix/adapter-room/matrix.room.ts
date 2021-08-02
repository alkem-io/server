// Brings typing to the objects that are returned from the Matrix JS SDK.

import { Room } from 'matrix-js-sdk';
// import { MatrixRoomResponseMessage } from './matrix.room.dto.response.message';

export class MatrixRoom extends Room {
  receiverEmail? = '';
  isDirect? = false;
}

export class MatrixRoomChunk {
  room_id!: string;
}
