import { IConversation } from '../conversation/conversation.interface';

export interface IConversationMembership {
  conversationId: string;
  actorId: string;
  conversation: IConversation;
  createdAt: Date;
}
