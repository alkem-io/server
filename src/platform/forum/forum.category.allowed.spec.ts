import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { ForumDiscussionCategoryException } from '@common/exceptions/forum.discussion.category.exception';
import {
  ADMIN_ONLY_FORUM_CATEGORIES,
  assertForumCategoryAllowed,
} from './forum.category.allowed';

describe('assertForumCategoryAllowed', () => {
  it('does not throw when the category is on the allowed list', () => {
    expect(() =>
      assertForumCategoryAllowed(
        [ForumDiscussionCategory.OTHER, ForumDiscussionCategory.HELP],
        ForumDiscussionCategory.OTHER
      )
    ).not.toThrow();
  });

  it('throws ForumDiscussionCategoryException when the category is not on the allowed list', () => {
    // The fixture forum below omits NEWSLETTER even though it is a real
    // vocabulary member — every real forum row carries all 8 members in
    // this delivery, so this fixture is the only place the allowed-set
    // rejection is exercisable end to end (it cannot be reproduced over
    // the wire today).
    expect(() =>
      assertForumCategoryAllowed(
        [ForumDiscussionCategory.OTHER],
        ForumDiscussionCategory.NEWSLETTER
      )
    ).toThrow(ForumDiscussionCategoryException);
  });
});

describe('ADMIN_ONLY_FORUM_CATEGORIES', () => {
  it('contains exactly RELEASES and NEWSLETTER', () => {
    expect(ADMIN_ONLY_FORUM_CATEGORIES.size).toBe(2);
    expect(
      ADMIN_ONLY_FORUM_CATEGORIES.has(ForumDiscussionCategory.RELEASES)
    ).toBe(true);
    expect(
      ADMIN_ONLY_FORUM_CATEGORIES.has(ForumDiscussionCategory.NEWSLETTER)
    ).toBe(true);
  });

  it('excludes every other member', () => {
    const others = Object.values(ForumDiscussionCategory).filter(
      category =>
        category !== ForumDiscussionCategory.RELEASES &&
        category !== ForumDiscussionCategory.NEWSLETTER
    );
    expect(others).toHaveLength(6);
    for (const category of others) {
      expect(ADMIN_ONLY_FORUM_CATEGORIES.has(category)).toBe(false);
    }
  });
});
