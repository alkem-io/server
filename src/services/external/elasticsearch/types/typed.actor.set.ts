import { ActorType } from '@common/enums/actor.type';

/**
 * Reserved analytics-only bucket key for an `actor_id` whose `ActorType`
 * cannot be resolved at index time (e.g. the actor was deleted between
 * emission and indexing, or the id is malformed). Not a member of the domain
 * `ActorType` enum — it exists only in the analytics record so counts never
 * silently shrink (FR-005). See feature 012-collabora-actor-type.
 */
export const UNKNOWN_ACTOR_TYPE = 'unknown';

/**
 * The type-keyed shape of the Collabora window-aggregate actor sets
 * (`writeActors` / `readonlyActors`). An object keyed by the exact `ActorType`
 * discriminator value (plus the reserved {@link UNKNOWN_ACTOR_TYPE}) whose
 * value is the array of distinct `actor_id`s of that type. Only non-empty
 * groups are present; an empty set serializes as `{}` (FR-002/003).
 *
 * Defined once here and imported by the Elasticsearch record type, the
 * `ContributionReporterService` signatures, and the consumer grouping helper so
 * the shape can never drift across the three call sites.
 */
export type TypedActorSet = Partial<
  Record<ActorType | typeof UNKNOWN_ACTOR_TYPE, string[]>
>;
