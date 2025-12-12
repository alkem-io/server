import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';
import { IConversation } from '../conversation/conversation.interface';

@ObjectType('Messaging')
export abstract class IMessaging extends IAuthorizable {
  conversations!: IConversation[];
}

@ObjectType('ConversationsSet')
export abstract class IConversationsSet extends IMessaging {}
