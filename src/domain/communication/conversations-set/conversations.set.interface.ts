import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';
import { IConversation } from '../conversation/conversation.interface';

@ObjectType('ConversationsSet')
export abstract class IConversationsSet extends IAuthorizable {
  conversations!: IConversation[];
}
