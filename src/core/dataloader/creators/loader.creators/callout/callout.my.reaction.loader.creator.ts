import { ReactionType } from '@common/enums/reaction.type';
import { ReactionService } from '@domain/collaboration/reaction/reaction.service';
import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';

/**
 * Request-scoped DataLoader that batches viewer-specific reaction lookups
 * for callouts. One query is issued per (user, request) pair regardless of
 * how many callouts appear on the page — the DataLoader coalesces all
 * `load(calloutId)` calls within a single event-loop tick into a single
 * `getMyReactionsForEntities` call.
 *
 * Scoped to the request so that different authenticated users in concurrent
 * requests each receive their own isolated loader state.
 */
@Injectable({ scope: Scope.REQUEST })
export class CalloutMyReactionLoaderCreator {
  private readonly loaders = new Map<
    string,
    DataLoader<string, string | null>
  >();

  constructor(private readonly reactionService: ReactionService) {}

  /**
   * Returns the emoji slug for the given callout and user, or null when the
   * user has not reacted or is unauthenticated. Calls are batched within the
   * same event-loop tick — one DB query per user per request.
   */
  async loadMyReaction(
    calloutId: string,
    userID: string | null
  ): Promise<string | null> {
    if (!userID) return null;

    let loader = this.loaders.get(userID);
    if (!loader) {
      loader = this.createLoaderForUser(userID);
      this.loaders.set(userID, loader);
    }
    return loader.load(calloutId);
  }

  private createLoaderForUser(
    userID: string
  ): DataLoader<string, string | null> {
    return new DataLoader<string, string | null>(
      async (calloutIds: readonly string[]) => {
        const map = await this.reactionService.getMyReactionsForEntities(
          ReactionType.POST,
          calloutIds,
          userID
        );
        return calloutIds.map(id => map.get(id) ?? null);
      },
      { cache: true, name: `CalloutMyReactionLoader:${userID}` }
    );
  }
}
