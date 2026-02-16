import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { IConversationMembership } from '@domain/communication/conversation-membership/conversation.membership.interface';
import { Inject, Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { inArray } from 'drizzle-orm';

/**
 * DataLoader creator for batching conversation membership lookups.
 * This prevents N+1 queries when resolving conversation type, user, and virtualContributor fields.
 * Batches membership queries across multiple conversations in a single database call.
 */
@Injectable()
export class ConversationMembershipsLoaderCreator
  implements DataLoaderCreator<IConversationMembership[]>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

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

    const memberships = await this.db.query.conversationMemberships.findMany({
      where: (table, { inArray }) => inArray(table.conversationId, [...conversationIds]),
      with: { agent: true },
      columns: {
        conversationId: true,
        agentId: true,
      },
    }) as unknown as IConversationMembership[];

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
