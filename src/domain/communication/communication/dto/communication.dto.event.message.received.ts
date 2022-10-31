import { IMessage } from '../../message/message.interface';

export class CommunicationEventMessageReceived {
  roomId!: string;

  roomName!: string;

  message!: IMessage;

  communicationID!: string;

  communityId!: string | undefined;
}
