import { IMessage } from '../../message/message.interface';

export class CommunicationEventMessageReceived {
  roomId!: string;

  roomName!: string;

  message!: IMessage;

  actorId!: string;

  communityId!: string | undefined;
}
