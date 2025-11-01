export class DeleteRoomInput {
  roomID!: string;

  // Needed for direct messaging rooms
  senderID?: string;

  receiverID?: string;
}
