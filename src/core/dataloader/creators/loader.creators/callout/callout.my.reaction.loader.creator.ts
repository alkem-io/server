import { ReactionType } from '@common/enums/reaction.type';
import { Reaction } from '@domain/collaboration/reaction/reaction.entity';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

/**
 * Helper service that fetches the requesting user's current reaction for a
 * single callout. Used by the reactionsSummary field resolver; the single-row
 * lookup is served by the (type, entityID, createdBy) unique index so it
 * does not perform a table scan even when called once per callout on a feed.
 *
 * Not a DataLoader creator — the query is keyed by both calloutID and userID,
 * making the standard per-request DataLoader pattern inapplicable here without
 * a composite cache key that the framework does not support out of the box.
 */
@Injectable()
export class CalloutMyReactionLoaderCreator {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  /**
   * Returns the emoji slug for the user's current reaction on the given
   * callout, or null when the user has not reacted or is unauthenticated.
   */
  async getMyReactionEmoji(
    calloutID: string,
    userID: string | null
  ): Promise<string | null> {
    if (!userID) return null;

    const row = await this.manager.getRepository(Reaction).findOne({
      where: {
        type: ReactionType.POST,
        entityID: calloutID,
        createdBy: userID,
      },
      select: ['emoji'],
    });

    return row?.emoji ?? null;
  }
}
