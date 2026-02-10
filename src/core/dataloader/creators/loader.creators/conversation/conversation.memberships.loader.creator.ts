import { EntityManager, In } from 'typeorm';
import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { ConversationMembership } from '@domain/communication/conversation-membership/conversation.membership.entity';
import { IConversationMembership } from '@domain/communication/conversation-membership/conversation.membership.interface';

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

    const memberships = await this.manager.find(ConversationMembership, {
      loadEagerRelations: false,
      where: { conversationId: In([...conversationIds]) },
      relations: { agent: true },
      select: {
        conversationId: true,
        agentId: true,
        agent: {
          id: true,
          type: true,
        },
      },
    });

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
