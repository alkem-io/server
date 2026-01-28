import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { ConversationMembership } from '@domain/communication/conversation-membership/conversation.membership.entity';
import { IConversationMembership } from '@domain/communication/conversation-membership/conversation.membership.interface';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';

/**
 * DataLoader creator for batching conversation membership lookups.
 * This prevents N+1 queries when resolving conversation type, user, and virtualContributor fields.
 * Batches membership queries across multiple conversations in a single database call.
 */
@Injectable()
export class ConversationMembershipsLoaderCreator
  implements DataLoaderCreator<IConversationMembership[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(): ILoader<IConversationMembership[]> {
    return new DataLoader<string, IConversationMembership[]>(
      async conversationIds => this.batchLoadMemberships(conversationIds),
      { cache: true, name: 'ConversationMembershipsLoader' }
    );
  }

  private async batchLoadMemberships(
    conversationIds: readonly string[]
  ): Promise<IConversationMembership[][]> {
    if (conversationIds.length === 0) {
      return [];
    }

    // Use QueryBuilder for selective column loading - only load agent.id and agent.type
    const memberships = await this.manager
      .getRepository(ConversationMembership)
      .createQueryBuilder('membership')
      .leftJoin('membership.agent', 'agent')
      .addSelect(['agent.id', 'agent.type'])
      .where('membership.conversationId IN (:...conversationIds)', {
        conversationIds: [...conversationIds],
      })
      .getMany();

    // Group by conversation ID for O(1) lookup
    const grouped = new Map<string, IConversationMembership[]>();
    for (const id of conversationIds) {
      grouped.set(id, []);
    }
    for (const membership of memberships) {
      grouped.get(membership.conversationId)?.push(membership);
    }

    // Return in input order
    return conversationIds.map(id => grouped.get(id) ?? []);
  }
}
