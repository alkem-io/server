import { CommunicationMessageResult } from './communication.dto.message.result';

export class CommunicationEventMessageReceived {
  roomId!: string;

  roomName!: string;

  message!: CommunicationMessageResult;

  communicationID!: string;

  communityId!: string | undefined;
}
