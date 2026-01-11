import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryColumn,
  JoinColumn,
} from 'typeorm';
import { IConversationMembership } from './conversation.membership.interface';
import { Conversation } from '../conversation/conversation.entity';
import { Actor } from '@domain/actor/actor/actor.entity';

@Entity()
export class ConversationMembership implements IConversationMembership {
  @PrimaryColumn('uuid')
  conversationId!: string;

  // actorId - the actor participating in this conversation
  @Index()
  @PrimaryColumn('uuid')
  actorId!: string;

  @Index()
  @ManyToOne(() => Conversation, conversation => conversation.memberships, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  conversation!: Conversation;

  @ManyToOne(() => Actor, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'actorId' })
  actor!: Actor;

  @CreateDateColumn()
  createdAt!: Date;
}
