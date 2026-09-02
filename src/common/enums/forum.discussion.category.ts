import { registerEnumType } from '@nestjs/graphql';

// Credentials to be added later:
/**
 * The forum's category vocabulary. Members are permanent tombstones: never
 * delete or rename one. A stored Discussion row (or a Matrix category space
 * key) may reference any member forever, including one later dropped from
 * the forum's *active* category list — deleting a member here would fail
 * non-null enum serialization for every such row and null the entire
 * platform query, not just that one row. Retiring a category is exclusively
 * a removal from the active list (data), never from this vocabulary
 * (schema) — see `adminForumRemoveDiscussionCategory`.
 *
 * Invariant for every member: the stored value equals the kebab-case of the
 * member name, and contains no comma (the active list is a comma-joined
 * `simple-array` column). Verified by `forum.discussion.category.spec.ts`.
 *
 * One sanctioned exception to that invariant, at the **label** layer only:
 * HELP displays as "Q&A" in the client (all 6 locales), while its stored
 * value, member name, and `/forum/help` URL stay `help` — an operator
 * ruling (spec 060 D-01) accepting that Help posts become Q&A posts without
 * per-post review. Do not "fix" this by renaming the value or adding a
 * separate Q&A member.
 */
export enum ForumDiscussionCategory {
  RELEASES = 'releases',
  PLATFORM_FUNCTIONALITIES = 'platform-functionalities',
  COMMUNITY_BUILDING = 'community-building',
  CHALLENGE_CENTRIC = 'challenge-centric',
  HELP = 'help',
  OTHER = 'other',
  NEWSLETTER = 'newsletter',
  TIPS_AND_TRICKS = 'tips-and-tricks',
}

registerEnumType(ForumDiscussionCategory, {
  name: 'ForumDiscussionCategory',
});
