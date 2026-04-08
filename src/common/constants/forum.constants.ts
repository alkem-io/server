/**
 * Fixed UUID v5 namespace for generating deterministic category context IDs.
 * Used to derive Matrix space IDs for forum categories:
 *   uuidv5(`${forum.id}:category:${categoryName}`, FORUM_CATEGORY_NAMESPACE)
 */
export const FORUM_CATEGORY_NAMESPACE = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
