import { LogContext } from '@common/enums';
import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { ForumDiscussionCategoryException } from '@common/exceptions/forum.discussion.category.exception';

/**
 * Categories only a platform admin may create a Discussion in, or move one
 * into. Releases speaks in the platform's own editorial voice; Newsletter
 * is the same outbound channel. Enforced on both create
 * and update — replaces the single hardcoded `RELEASES` comparison this
 * delivery removes.
 *
 * Pure data, no DI: kept here (not on `ForumService`) so both
 * `ForumResolverMutations` (create) and `DiscussionResolverMutations`
 * (update) can import it without `ForumModule` and the discussion module
 * depending on each other's resolvers.
 */
export const ADMIN_ONLY_FORUM_CATEGORIES: ReadonlySet<ForumDiscussionCategory> =
  new Set([
    ForumDiscussionCategory.RELEASES,
    ForumDiscussionCategory.NEWSLETTER,
  ]);

/**
 * `ADMIN_ONLY_FORUM_CATEGORIES.has()` narrowed to accept the plain `string`
 * category fields carried by the create/update DTOs (their `@Field()`
 * points GraphQL at `ForumDiscussionCategory`, but the TS property itself is
 * `string` — the existing DTO convention this delivery does not change).
 */
export function isAdminOnlyForumCategory(category: string): boolean {
  return ADMIN_ONLY_FORUM_CATEGORIES.has(category as ForumDiscussionCategory);
}

/**
 * The full set of vocabulary members this running build recognises, shared
 * by every read-side drift guard (`Forum.discussionCategories`,
 * `Discussion.category`) so both boundaries stay in lockstep as the
 * vocabulary grows.
 */
const KNOWN_FORUM_CATEGORIES: ReadonlySet<string> = new Set(
  Object.values(ForumDiscussionCategory)
);

/**
 * True when `category` is a member of this build's `ForumDiscussionCategory`
 * vocabulary. A stored or otherwise-sourced value can fail this check when
 * the running build is behind the data (rolled-back server after a
 * migration-first deploy) or ahead of it (hand-edited data) — callers use it
 * to substitute a safe fallback member before the value reaches non-null
 * enum serialization, rather than letting GraphQL throw and null out an
 * unrelated ancestor field.
 */
export function isKnownForumCategory(category: string): boolean {
  return KNOWN_FORUM_CATEGORIES.has(category);
}

/**
 * Shared allowed-set guard applied to both creating a Discussion and
 * changing one's category. This is a data-integrity check, not a security
 * boundary: every path that reaches it is already
 * gated by CREATE_DISCUSSION/UPDATE authorization (and, for the admin-only
 * categories above, PLATFORM_ADMIN) — the guard exists so that "empty" can
 * be held as a server-enforced invariant for the category-retirement
 * mutation, rather than a claim nothing actually checks.
 */
export function assertForumCategoryAllowed(
  allowedCategories: string[],
  category: string
): void {
  if (!allowedCategories.includes(category)) {
    throw new ForumDiscussionCategoryException(
      `Invalid discussion category supplied ('${category}'), allowed categories: ${allowedCategories}`,
      LogContext.PLATFORM_FORUM
    );
  }
}
