import { Entity, OneToMany } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Conversation } from '../conversation/conversation.entity';
import { IConversationsSet } from './conversations.set.interface';

@Entity()
export class ConversationsSet
  extends AuthorizableEntity
  implements IConversationsSet
{
  @OneToMany(
    () => Conversation,
    conversation => conversation.conversationsSet,
    {
      eager: false,
      cascade: true,
    }
  )
  conversations!: Conversation[];
}
