import { BaseSubscriptionPayload } from '@common/interfaces';
import { IActor } from '@domain/actor/actor/actor.interface';
import { IConversation } from '@domain/communication/conversation/conversation.interface';
import { IMessage } from '@domain/communication/message/message.interface';

export interface ConversationEventSubscriptionPayload
  extends BaseSubscriptionPayload {
  memberActorIds: string[];
  conversationCreated?: {
    conversation: IConversation;
    message?: IMessage;
  };
  conversationUpdated?: {
    conversation: IConversation;
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
  memberAdded?: {
    conversation: IConversation;
    addedMember: IActor;
  };
  memberRemoved?: {
    conversation: IConversation;
    removedMemberID: string;
  };
  conversationDeleted?: {
    conversationID: string;
  };
}
