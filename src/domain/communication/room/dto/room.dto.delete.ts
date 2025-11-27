export class DeleteRoomInput {
  roomID!: string;

  // Needed for direct messaging rooms
  senderAgentID?: string;

  receiverAgentID?: string;
}
