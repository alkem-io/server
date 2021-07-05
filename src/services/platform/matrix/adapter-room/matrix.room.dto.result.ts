// Brings typing to the objects that are returned from the Matrix JS SDK.

import { MatrixRoomResponseMessage } from './matrix.room.dto.response.message';

export class MatrixRoom {
  roomID!: string; //	The ID of this room.
  name? = ''; //	The human-readable display name for this room.
  receiverEmail? = '';
  isDirect? = false;
  timeline?: MatrixRoomResponseMessage[] = [];
  groupID? = '';
}
