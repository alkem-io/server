import { CommunicationMessageAttachment } from './communication.message.attachment';

export class CommunicationSendMessageReplyInput {
  actorID!: string;

  message!: string;

  roomID!: string;

  threadID!: string;

  // Resolved media attachments (feature 013). Threaded to the matrix-adapter as
  // SendMessageRequest.attachments.
  attachments?: CommunicationMessageAttachment[];
}
