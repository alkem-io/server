import { LogContext } from '@common/enums/logging.context';
import { ReactionType } from '@common/enums/reaction.type';
import { ValidationException } from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CALLOUT_REACTION_ALLOWED_EMOJIS } from './reaction.constants';
import { Reaction } from './reaction.entity';
import { IReaction } from './reaction.interface';

/** Tier-1 summary for one entity: totals + distinct emoji slugs. */
export interface ReactionSummary {
  entityID: string;
  /** Number of distinct people currently holding a reaction. */
  total: number;
  /**
   * Distinct emoji slugs in use, ordered by their position in the allow-list.
   * Unknown slugs (from a narrowed allow-list) are placed last.
   */
  emojis: string[];
}

/**
 * Generic, type-agnostic reaction service.
 *
 * All methods are keyed by (ReactionType, entityID) so the same service
 * serves every future reaction context (polls, responses, …) without
 * modification. Callout-specific logic (authorization, lifecycle cleanup)
 * lives in the callout module.
 */
@Injectable()
export class ReactionService {
  constructor(
    @InjectRepository(Reaction)
    private reactionRepository: Repository<Reaction>
  ) {}

  /**
   * Validates that the emoji slug is on the platform allow-list.
   * Throws ValidationException on miss — this is the sole gate; the
   * Emoji GraphQL scalar is deliberately NOT used (its regex is unanchored
   * and accepts ASCII characters like '1', '#', '*').
   */
  validateAllowedEmojiOrFail(emoji: string): void {
    if (!CALLOUT_REACTION_ALLOWED_EMOJIS.includes(emoji)) {
      throw new ValidationException(
        'Emoji is not on the allowed list',
        LogContext.COLLABORATION,
        { emoji, allowed: CALLOUT_REACTION_ALLOWED_EMOJIS }
      );
    }
  }

  /**
   * Atomically inserts a new reaction or swaps the emoji on the existing one.
   * Single-statement INSERT … ON CONFLICT DO UPDATE ensures concurrent
   * double-fires from the same user always converge to one row.
   */
  async upsertReaction(
    type: ReactionType,
    entityID: string,
    userID: string,
    emoji: string
  ): Promise<IReaction> {
    await this.reactionRepository
      .createQueryBuilder()
      .insert()
      .into(Reaction)
      .values({ type, entityID, createdBy: userID, emoji })
      .orUpdate(['emoji', 'updatedDate'], ['type', 'entityID', 'createdBy'])
      .setParameter('updatedDate', new Date())
      .execute();

    // Re-fetch to return the canonical record after the upsert.
    const saved = await this.reactionRepository.findOneOrFail({
      where: { type, entityID, createdBy: userID },
    });
    return saved;
  }

  /**
   * Removes the user's own reaction. Idempotent: zero-row deletes resolve
   * without error — unlike the poll-vote throwing removeVote, this is
   * explicitly a no-op on a missing reaction (US3-AS3).
   */
  async removeReaction(
    type: ReactionType,
    entityID: string,
    userID: string
  ): Promise<void> {
    await this.reactionRepository.delete({ type, entityID, createdBy: userID });
  }

  /**
   * Tier-1 batched summary: one GROUP BY query for N entities.
   * Returns one entry per entity that has at least one reaction; entities
   * with no reactions are omitted (callers default to totals of zero).
   */
  async getSummaryForEntities(
    type: ReactionType,
    entityIDs: readonly string[]
  ): Promise<ReactionSummary[]> {
    if (entityIDs.length === 0) return [];

    const rows = await this.reactionRepository
      .createQueryBuilder('r')
      .select('r.entityID', 'entityID')
      .addSelect('COUNT(DISTINCT r.createdBy)', 'total')
      .addSelect('array_agg(DISTINCT r.emoji)', 'emojis')
      .where('r.type = :type AND r.entityID IN (:...entityIDs)', {
        type,
        entityIDs: [...entityIDs],
      })
      .groupBy('r.entityID')
      .getRawMany<{ entityID: string; total: string; emojis: string[] }>();

    const allowedOrder = CALLOUT_REACTION_ALLOWED_EMOJIS;
    return rows.map(row => ({
      entityID: row.entityID,
      total: parseInt(row.total, 10),
      emojis: [...row.emojis].sort((a, b) => {
        const ai = allowedOrder.indexOf(a);
        const bi = allowedOrder.indexOf(b);
        const aPos = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
        const bPos = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
        return aPos - bPos;
      }),
    }));
  }

  /**
   * Tier-1 batched personal read: the current user's reaction slug for each
   * entity. Returns a map from entityID to emoji slug (absent = no reaction).
   */
  async getMyReactionsForEntities(
    type: ReactionType,
    entityIDs: readonly string[],
    userID: string
  ): Promise<Map<string, string>> {
    if (entityIDs.length === 0) return new Map();

    const rows = await this.reactionRepository.find({
      where: entityIDs.map(id => ({ type, entityID: id, createdBy: userID })),
      select: ['entityID', 'emoji'],
    });

    const result = new Map<string, string>();
    for (const row of rows) {
      result.set(row.entityID, row.emoji);
    }
    return result;
  }

  /**
   * Tier-2 detail: up to `cap` reactions for one entity, most recently
   * changed first. Used only on demand (who-reacted popover).
   */
  async getReactionsForEntity(
    type: ReactionType,
    entityID: string,
    cap = 100
  ): Promise<IReaction[]> {
    return this.reactionRepository.find({
      where: { type, entityID },
      order: { updatedDate: 'DESC' },
      take: cap,
    });
  }

  /**
   * Removes all reactions for a target entity. Called by the target's delete
   * flow (e.g. deleteCallout) before the target row is removed, so no orphans
   * can ever arise even on partial failure.
   *
   * Pass an EntityManager to enroll this delete in a caller-owned transaction
   * (so it commits or rolls back atomically with the target row removal);
   * omit it to use this service's own repository.
   */
  async deleteAllForEntity(
    type: ReactionType,
    entityID: string,
    manager?: EntityManager
  ): Promise<void> {
    const repository = manager
      ? manager.getRepository(Reaction)
      : this.reactionRepository;
    await repository.delete({ type, entityID });
  }
}
