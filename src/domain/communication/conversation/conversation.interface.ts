import { ObjectType, Field } from '@nestjs/graphql';
import { IRoom } from '@domain/communication/room/room.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IMessaging } from '../messaging/messaging.interface';
import { IConversationMembership } from '../conversation-membership/conversation.membership.interface';
import { IUser } from '@domain/community/user/user.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';

@ObjectType('Conversation')
export abstract class IConversation extends IAuthorizable {
  // All fields now resolved via ConversationMembership pivot table or computed dynamically
  // See conversation.resolver.fields.ts for type/user/virtualContributor field resolvers

  memberships?: IConversationMembership[];

  room?: IRoom;

  @Field(() => IMessaging)
  messaging!: IMessaging;

  /**
   * Pre-resolved user for subscription events.
   * When set, the field resolver will return this instead of computing dynamically.
   * This allows personalized events where each recipient sees the "other user".
   */
  _resolvedUser?: IUser | null;

  /**
   * Pre-resolved virtual contributor for subscription events.
   * When set, the field resolver will return this instead of computing dynamically.
   */
  _resolvedVirtualContributor?: IVirtualContributor | null;
}
