import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IConversationMembership } from '../conversation-membership/conversation.membership.interface';
import { IMessaging } from '../messaging/messaging.interface';

@ObjectType('Conversation')
export abstract class IConversation extends IAuthorizable {
  memberships?: IConversationMembership[];

  room?: IRoom;

  @Field(() => IMessaging)
  messaging!: IMessaging;
}
