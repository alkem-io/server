import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationMembership } from './conversation.membership.entity';

@Injectable()
export class ConversationMembershipService {
  constructor(
    @InjectRepository(ConversationMembership)
    private conversationMembershipRepository: Repository<ConversationMembership>
  ) {}

  /**
   * Updates the lastReadAt timestamp for a conversation membership.
   * Called when a user opens/views a conversation.
   */
  async updateLastReadAt(
    conversationId: string,
    agentId: string
  ): Promise<void> {
    await this.conversationMembershipRepository.update(
      { conversationId, agentId },
      { lastReadAt: new Date() }
    );
  }

  /**
   * Gets the count of conversations with unread messages for a user.
   * A conversation is considered unread if:
   * - The room has at least one message (messagesCount > 0)
   * - AND either lastReadAt is null OR lastMessageAt > lastReadAt
   */
  async getUnreadConversationsCount(agentId: string): Promise<number> {
    const result = await this.conversationMembershipRepository
      .createQueryBuilder('cm')
      .innerJoin('cm.conversation', 'c')
      .innerJoin('c.room', 'r')
      .where('cm.agentId = :agentId', { agentId })
      .andWhere('r.messagesCount > 0')
      .andWhere('(cm.lastReadAt IS NULL OR r.lastMessageAt > cm.lastReadAt)')
      .getCount();

    return result;
  }

  /**
   * Gets conversation memberships for other participants of a conversation.
   * Used to notify other members when a message is sent.
   */
  async getOtherMemberships(
    conversationId: string,
    excludeAgentId: string
  ): Promise<ConversationMembership[]> {
    return this.conversationMembershipRepository
      .find({
        where: {
          conversationId,
        },
        relations: {
          agent: true,
        },
      })
      .then(memberships =>
        memberships.filter(m => m.agentId !== excludeAgentId)
      );
  }
}
