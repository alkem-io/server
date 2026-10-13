import { ExistingMediaRef } from '@alkemio/matrix-adapter-lib';

export class CommunicationSendMessageReplyInput {
  actorID!: string;

  message!: string;

  roomID!: string;

  threadID!: string;

  existingMedia?: ExistingMediaRef;
}
