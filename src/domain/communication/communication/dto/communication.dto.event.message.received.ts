import { IMessage } from '../../message/message.interface';

export class CommunicationEventMessageReceived {
  roomId!: string;

  roomName!: string;

  message!: IMessage;

  actorID!: string;

  communityId!: string | undefined;
}
