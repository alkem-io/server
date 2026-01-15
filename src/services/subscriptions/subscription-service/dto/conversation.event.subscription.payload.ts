import { BaseSubscriptionPayload } from '@common/interfaces';
import { IMessage } from '@domain/communication/message/message.interface';
import { IConversation } from '@domain/communication/conversation/conversation.interface';

export interface ConversationEventSubscriptionPayload
  extends BaseSubscriptionPayload {
  memberAgentIds: string[];
  conversationCreated?: {
    conversation: IConversation;
    message?: IMessage;
  };
  messageReceived?: {
    roomId: string;
    message: IMessage;
  };
  messageRemoved?: {
    roomId: string;
    messageId: string;
  };
  readReceiptUpdated?: {
    roomId: string;
    lastReadMessageId: string;
  };
}
