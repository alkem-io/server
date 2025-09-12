import { Mention } from '@domain/communication/messaging/mention.interface';
import { NotificationInputBase } from '../notification.dto.input.base';

export interface NotificationInputEntityMentions extends NotificationInputBase {
  roomId: string;
  messageID: string;
  mentions: Mention[];
}
