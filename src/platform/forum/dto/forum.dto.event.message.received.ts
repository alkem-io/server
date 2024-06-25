import { IMessage } from '@domain/communication/message/message.interface';

export class ForumEventMessageReceived {
  roomId!: string;

  roomName!: string;

  message!: IMessage;

  forumID!: string;

  communityId!: string | undefined;
}
