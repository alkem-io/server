import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { IConversation } from './conversation.interface';
import { Room } from '@domain/communication/room/room.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { ConversationsSet } from '../conversations-set/conversations.set.entity';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import {
  ENUM_LENGTH,
  UUID_LENGTH,
} from '@common/constants/entity.field.length.constants';
import { IAgent } from '@domain/agent/agent/agent.interface';

@Entity()
export class Conversation extends AuthorizableEntity implements IConversation {
  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: CommunicationConversationType;

  @Column('json', { nullable: false })
  userIDs!: string[];

  @Column('char', { length: UUID_LENGTH, nullable: true })
  agentID?: string;

  agent?: IAgent;

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
