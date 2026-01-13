import { Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { IConversation } from './conversation.interface';
import { Room } from '@domain/communication/room/room.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Messaging } from '../messaging/messaging.entity';
import { ConversationMembership } from '../conversation-membership/conversation.membership.entity';

@Entity()
export class Conversation extends AuthorizableEntity implements IConversation {
  // All participant tracking now via ConversationMembership pivot table
  // Type inferred dynamically via field resolver from member agent types

  @OneToMany(
    () => ConversationMembership,
    membership => membership.conversation,
    {
      eager: false,
      cascade: true,
    }
  )
  memberships!: ConversationMembership[];

  @ManyToOne(() => Messaging, messaging => messaging.conversations, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  messaging!: Messaging;

  @OneToOne(() => Room, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  room?: Room;
}
