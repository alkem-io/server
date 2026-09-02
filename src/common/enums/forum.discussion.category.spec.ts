import { ForumDiscussionCategory } from './forum.discussion.category';

/**
 * Proves the shape invariant documented at the enum declaration: every
 * member's stored value equals kebab-case of the member name, and contains
 * no comma (the active list is a comma-joined `simple-array` column).
 * HELP's label divergence is a display-layer exception only — its stored
 * value still satisfies this invariant.
 */
describe('ForumDiscussionCategory shape invariant', () => {
  const kebabCase = (memberName: string) =>
    memberName.toLowerCase().replace(/_/g, '-');

  it('has exactly 8 members after the newsletter/tips-and-tricks additions', () => {
    expect(Object.values(ForumDiscussionCategory)).toHaveLength(8);
  });

  it.each(
    Object.entries(ForumDiscussionCategory)
  )('value for %s equals kebab-case of the member name', (memberName, value) => {
    expect(value).toBe(kebabCase(memberName));
  });

  it.each(
    Object.values(ForumDiscussionCategory)
  )('value %s contains no comma', value => {
    expect(value).not.toContain(',');
  });

  it('keeps the 6 pre-existing members byte-identical', () => {
    expect(ForumDiscussionCategory.RELEASES).toBe('releases');
    expect(ForumDiscussionCategory.PLATFORM_FUNCTIONALITIES).toBe(
      'platform-functionalities'
    );
    expect(ForumDiscussionCategory.COMMUNITY_BUILDING).toBe(
      'community-building'
    );
    expect(ForumDiscussionCategory.CHALLENGE_CENTRIC).toBe('challenge-centric');
    expect(ForumDiscussionCategory.HELP).toBe('help');
    expect(ForumDiscussionCategory.OTHER).toBe('other');
  });

  it('adds exactly the two new members', () => {
    expect(ForumDiscussionCategory.NEWSLETTER).toBe('newsletter');
    expect(ForumDiscussionCategory.TIPS_AND_TRICKS).toBe('tips-and-tricks');
  });
});
