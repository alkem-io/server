import { Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Conversation } from '../conversation/conversation.entity';
import { IConversationsSet } from './conversations.set.interface';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';

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

  @OneToOne(() => VirtualContributor, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  guidanceVirtualContributor?: VirtualContributor;
}
