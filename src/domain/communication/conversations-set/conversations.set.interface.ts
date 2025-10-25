import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';
import { IConversation } from '../conversation/conversation.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';

@ObjectType('ConversationsSet')
export abstract class IConversationsSet extends IAuthorizable {
  conversations!: IConversation[];

  guidanceVirtualContributor?: IVirtualContributor;
}
