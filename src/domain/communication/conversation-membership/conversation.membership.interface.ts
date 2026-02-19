import { IConversation } from '../conversation/conversation.interface';

export interface IConversationMembership {
  conversationId: string;
  actorID: string;
  conversation: IConversation;
  createdAt: Date;
}
