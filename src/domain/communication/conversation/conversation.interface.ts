import { ObjectType } from '@nestjs/graphql';
import { IRoom } from '@domain/communication/room/room.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IConversationsSet } from '../conversations-set/conversations.set.interface';
import { IConversationMembership } from './conversation-membership.interface';

@ObjectType('Conversation')
export abstract class IConversation extends IAuthorizable {
  // All fields now resolved via ConversationMembership pivot table or computed dynamically
  // See conversation.resolver.fields.ts for type/user/virtualContributor field resolvers

  memberships?: IConversationMembership[];

  room?: IRoom;
  conversationsSet!: IConversationsSet;
}
