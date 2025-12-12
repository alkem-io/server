import { Entity, OneToMany, OneToOne } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Conversation } from '../conversation/conversation.entity';
import { IConversationsSet } from './conversations.set.interface';
import { Platform } from '@platform/platform/platform.entity';

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

  @OneToOne(() => Platform, platform => platform.conversationsSet)
  platform?: Platform;
}
