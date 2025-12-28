import { IActor } from '@domain/actor/actor/actor.interface';
import { IConversation } from '../conversation/conversation.interface';

export interface IConversationMembership {
  conversationId: string;
  actorId: string;
  conversation: IConversation;
  actor: IActor;
  createdAt: Date;
}
