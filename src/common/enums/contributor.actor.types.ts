import { ActorType } from './actor.type';

/**
 * The `ActorType` subtypes that can be community contributors (FR-005).
 *
 * The platform unified Agent/Contributor into the single `Actor` model
 * (refactor #5856), so there is intentionally NO separate "contributor type"
 * enum — the contributor-collection callout reuses `ActorType` constrained to
 * this subset (excludes SPACE / ACCOUNT / VIRTUAL_ASSISTANT, which are not
 * community contributors).
 */
export const CONTRIBUTOR_ACTOR_TYPES: readonly ActorType[] = [
  ActorType.USER,
  ActorType.ORGANIZATION,
  ActorType.VIRTUAL_CONTRIBUTOR,
];

/** Whether the given ActorType is a valid community-contributor subtype. */
export const isContributorActorType = (type: ActorType): boolean =>
  CONTRIBUTOR_ACTOR_TYPES.includes(type);
