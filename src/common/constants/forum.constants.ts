import { v5 as uuidv5 } from 'uuid';

/**
 * Fixed UUID v5 namespace for generating deterministic category context IDs.
 * Used to derive Matrix space IDs for forum categories:
 *   uuidv5(`${forum.id}:category:${categoryName}`, FORUM_CATEGORY_NAMESPACE)
 */
export const FORUM_CATEGORY_NAMESPACE = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

/**
 * Derive the deterministic Matrix context id for a forum category's Matrix
 * space. The same forum id + category name always produce the same id, so a
 * retired category's space is never re-created under a different identity —
 * every caller that needs a category's context id MUST go through this
 * single derivation rather than inlining the uuidv5 call.
 */
export function getForumCategoryContextId(
  forumId: string,
  categoryName: string
): string {
  return uuidv5(
    `${forumId}:category:${categoryName}`,
    FORUM_CATEGORY_NAMESPACE
  );
}
