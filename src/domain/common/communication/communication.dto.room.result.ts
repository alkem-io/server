import { CommunicationMessageResult } from './communication.dto.message.result';

export class CommunicationRoomResult {
  id!: string;

  messages!: CommunicationMessageResult[];
}
