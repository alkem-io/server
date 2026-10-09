import { ExistingMediaRef } from '@alkemio/matrix-adapter-lib';

export class CommunicationSendMessageInput {
  actorID!: string;

  message!: string;

  roomID!: string;

  existingMedia?: ExistingMediaRef;
}
