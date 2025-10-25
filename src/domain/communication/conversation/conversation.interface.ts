import { ObjectType } from '@nestjs/graphql';
import { IRoom } from '@domain/communication/room/room.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IConversationsSet } from '../conversations-set/conversations.set.interface';

@ObjectType('Conversation')
export abstract class IConversation extends IAuthorizable {
  room?: IRoom;
  conversationsSet?: IConversationsSet;
}
