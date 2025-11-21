export class DeleteRoomInput {
  roomID!: string;

  // Needed for direct messaging rooms
  senderCommunicationID?: string;

  receiverCommunicationID?: string;
}
