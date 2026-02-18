import { ActorType } from '@common/enums/actor.type';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { Actor } from '@domain/actor/actor/actor.entity';
import { ConversationMembership } from '@domain/communication/conversation-membership/conversation.membership.entity';
import { IConversationMembership } from '@domain/communication/conversation-membership/conversation.membership.interface';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { EntityManager, In } from 'typeorm';

/**
 * Extended membership type that includes actor type information.
 * This is used internally by the dataloader to provide type info
 * without requiring a separate actor relation on ConversationMembership.
 */
export interface IConversationMembershipWithActorType
  extends IConversationMembership {
  actorType?: ActorType;
}

/**
 * DataLoader creator for batching conversation membership lookups.
 * This prevents N+1 queries when resolving conversation type, user, and virtualContributor fields.
 * Batches membership queries across multiple conversations in a single database call.
 * Enriches memberships with actor type by querying the Actor table.
 */
@Injectable()
export class ConversationMembershipsLoaderCreator
  implements DataLoaderCreator<IConversationMembershipWithActorType[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(): ILoader<IConversationMembershipWithActorType[]> {
    return new DataLoader<string, IConversationMembershipWithActorType[]>(
      async conversationIds => this.batchLoadMemberships(conversationIds),
      { cache: true, name: 'ConversationMembershipsLoader' }
    );
  }

  private async batchLoadMemberships(
    conversationIds: readonly string[]
  ): Promise<IConversationMembershipWithActorType[][]> {
    if (conversationIds.length === 0) {
      return [];
    }

    const memberships = await this.manager.find(ConversationMembership, {
      loadEagerRelations: false,
      where: { conversationId: In([...conversationIds]) },
      select: {
        conversationId: true,
        actorId: true,
      },
    });

    // Collect all unique actorIds to batch-lookup their types
    const actorIds = [...new Set(memberships.map(m => m.actorId))];
    const actorTypeMap = new Map<string, ActorType>();
    if (actorIds.length > 0) {
      const actors = await this.manager.find(Actor, {
        where: { id: In(actorIds) },
        select: { id: true, type: true },
      });
      for (const actor of actors) {
        actorTypeMap.set(actor.id, actor.type);
      }
    }

    // Enrich memberships with actor type
    const enrichedMemberships: IConversationMembershipWithActorType[] =
      memberships.map(m => ({
        ...m,
        actorType: actorTypeMap.get(m.actorId),
      }));

    // Group by conversation ID for O(1) lookup
    const grouped = new Map<string, IConversationMembershipWithActorType[]>();
    for (const id of conversationIds) {
      grouped.set(id, []);
    }
    for (const membership of enrichedMemberships) {
      grouped.get(membership.conversationId)?.push(membership);
    }

    // Return in input order
    return conversationIds.map(id => grouped.get(id) ?? []);
  }
}
