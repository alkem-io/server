export type MatrixRoomResponseMessage = {
  originServerTimestamp: number;
  body: string;
  sender: MatrixRoomResponseMessageSender;
  event: any;
};

export type MatrixRoomResponseMessageSender = {
  name: string;
};
