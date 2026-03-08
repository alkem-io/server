import { Actor } from '@domain/actor/actor/actor.entity';
import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Conversation } from '../conversation/conversation.entity';
import { IConversationMembership } from './conversation.membership.interface';

@Entity()
export class ConversationMembership implements IConversationMembership {
  @PrimaryColumn('uuid')
  conversationId!: string;

  // actorID - the actor participating in this conversation
  @Index()
  @ManyToOne(() => Actor, { eager: false, cascade: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actorId' })
  @PrimaryColumn('uuid', { name: 'actorId' })
  actorID!: string;

  @Index()
  @ManyToOne(
    () => Conversation,
    conversation => conversation.memberships,
    {
      eager: false,
      cascade: false,
      onDelete: 'CASCADE',
    }
  )
  conversation!: Conversation;

  @CreateDateColumn()
  createdAt!: Date;
}
