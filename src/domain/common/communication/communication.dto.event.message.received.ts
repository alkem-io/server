import { CommunicationMessageResult } from './communication.dto.message.result';

export class CommunicationEventMessageReceived {
  roomId!: string;

  roomName!: string;

  message!: CommunicationMessageResult;

  userID!: string;

  communityId!: string | undefined;
}
