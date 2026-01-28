import { Agent } from '@domain/agent/agent/agent.entity';
import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Conversation } from '../conversation/conversation.entity';
import { IConversationMembership } from './conversation.membership.interface';

@Entity()
export class ConversationMembership implements IConversationMembership {
  @PrimaryColumn('uuid')
  conversationId!: string;

  @Index()
  @PrimaryColumn('uuid')
  agentId!: string;

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

  @ManyToOne(() => Agent, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  agent!: Agent;

  @CreateDateColumn()
  createdAt!: Date;
}
