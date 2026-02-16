import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Room } from '@domain/communication/room/room.entity';
import { ConversationMembership } from '../conversation-membership/conversation.membership.entity';
import { Messaging } from '../messaging/messaging.entity';
import { IConversation } from './conversation.interface';

export class Conversation extends AuthorizableEntity implements IConversation {
  // All participant tracking now via ConversationMembership pivot table
  // Type inferred dynamically via field resolver from member agent types

  memberships!: ConversationMembership[];

  messaging!: Messaging;

  room?: Room;
}
