import { Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { IConversation } from './conversation.interface';
import { Room } from '@domain/communication/room/room.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { ConversationsSet } from '../conversations-set/conversations.set.entity';

@Entity()
export class Conversation extends AuthorizableEntity implements IConversation {
  @ManyToOne(
    () => ConversationsSet,
    conversationsSet => conversationsSet.conversations,
    {
      eager: false,
      cascade: false,
      onDelete: 'CASCADE',
    }
  )
  conversationsSet?: ConversationsSet;

  @OneToOne(() => Room, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  room!: Room;
}
