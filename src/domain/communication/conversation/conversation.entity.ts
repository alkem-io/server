import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Room } from '@domain/communication/room/room.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { ConversationMembership } from '../conversation-membership/conversation.membership.entity';
import { Messaging } from '../messaging/messaging.entity';
import { IConversation } from './conversation.interface';

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

  @ManyToOne(
    () => Messaging,
    messaging => messaging.conversations,
    {
      eager: false,
      cascade: false,
      onDelete: 'CASCADE',
    }
  )
  messaging!: Messaging;

  @OneToOne(() => Room, {
    eager: true,
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  room!: Room;

  // Per-conversation storage for message attachments (feature 013). Created
  // eagerly in ConversationService.createConversation; the bucket auth mirrors
  // conversation membership. Optional so the relation isn't required to be
  // loaded on every fetch.
  @OneToOne(() => StorageAggregator, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageAggregator?: StorageAggregator;
}
