import { BaseSubscriptionPayload } from '@common/interfaces';
import { IMessage } from '@domain/communication/message/message.interface';
import { IConversationMembership } from '@domain/communication/conversation-membership/conversation.membership.interface';

export interface ConversationEventSubscriptionPayload
  extends BaseSubscriptionPayload {
  memberAgentIds: string[];
  senderAgentId: string;
  conversationCreated?: {
    id: string;
    roomId: string;
    memberships?: IConversationMembership[];
    message: IMessage;
  };
  messageReceived?: {
    roomId: string;
    message: IMessage;
  };
  readReceiptUpdated?: {
    roomId: string;
    lastReadMessageId: string;
  };
}
