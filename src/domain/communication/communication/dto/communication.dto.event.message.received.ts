import { CommunicationMessageResult } from '../../message/communication.dto.message.result';

export class CommunicationEventMessageReceived {
  roomId!: string;

  roomName!: string;

  message!: CommunicationMessageResult;

  communicationID!: string;

  communityId!: string | undefined;
}
