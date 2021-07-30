import { MatrixEvent } from 'matrix-js-sdk';
export type MatrixRoomResponseMessage = MatrixEvent;
// {
//   originServerTimestamp: number;
//   body: string;
//   sender: MatrixRoomResponseMessageSender;
//   event: any;
// };

export type MatrixRoomResponseMessageSender = {
  name: string;
};
