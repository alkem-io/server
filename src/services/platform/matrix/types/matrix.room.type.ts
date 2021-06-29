// Brings typing to the objects that are returned from the Matrix JS SDK.

import { MatrixResponseMessage } from './matrix.response.message.type';

export type eventHandler = (args0?: any, args1?: any, args2?: any) => void;

export type MatrixRoom = {
  roomId: string; //	The ID of this room.
  name: string; //	The human-readable display name for this room.
  timeline: MatrixResponseMessage[];
};
