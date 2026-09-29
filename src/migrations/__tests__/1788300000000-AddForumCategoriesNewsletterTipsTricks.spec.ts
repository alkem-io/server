import { AddForumCategoriesNewsletterTipsTricks1788300000000 } from '../1788300000000-AddForumCategoriesNewsletterTipsTricks';

/**
 * Behavioral spec against a minimal in-memory fake of `QueryRunner` — the
 * migration only ever issues a `SELECT f.id, f."discussionCategories" FROM
 * forum f INNER JOIN platform p ON p."forumId" = f.id FOR UPDATE OF f` and,
 * per drifted row, a parameterized `UPDATE forum SET
 * "discussionCategories" = $1 WHERE id = $2`, so a tiny two-table fake
 * (a `forum` row-store plus a single `platform."forumId"` pointer) exercises
 * the real up()/down() logic — including which row the join resolves to —
 * without a live PostgreSQL container.
 */
class FakeForumAndPlatformTables {
  private forumRows = new Map<string, string | null>();
  private readonly platformForumId: string | undefined;
  readonly statements: string[] = [];

  constructor(seed: {
    forums: Record<string, string | null>;
    platformForumId?: string;
  }) {
    for (const [id, value] of Object.entries(seed.forums)) {
      this.forumRows.set(id, value);
    }
    this.platformForumId = seed.platformForumId;
  }

  get(id: string): string | null | undefined {
    return this.forumRows.get(id);
  }

  selects(): string[] {
    return this.statements.filter(statement => statement.startsWith('SELECT'));
  }

  asQueryRunner() {
    return {
      query: async (sql: string, params?: unknown[]) => {
        const statement = sql.trim();
        this.statements.push(statement);
        if (statement.startsWith('SELECT')) {
          if (!/join\s+platform/i.test(statement)) {
            // A query that doesn't join through platform."forumId" is the
            // unscoped "every forum row" shape this migration must not
            // issue — fall back to real Postgres semantics for it so a
            // regression back to that shape is caught by the tests below
            // instead of silently passing.
            return Array.from(this.forumRows.entries()).map(
              ([id, discussionCategories]) => ({ id, discussionCategories })
            );
          }
          // Mirrors the real INNER JOIN on platform."forumId": only the
          // forum row the platform actually points to is ever resolved,
          // and 0 rows come back when nothing is wired up.
          if (
            this.platformForumId === undefined ||
            !this.forumRows.has(this.platformForumId)
          ) {
            return [];
          }
          return [
            {
              id: this.platformForumId,
              discussionCategories:
                this.forumRows.get(this.platformForumId) ?? null,
            },
          ];
        }
        if (statement.startsWith('UPDATE')) {
          const [updated, id] = params as [string, string];
          this.forumRows.set(id, updated);
          return [];
        }
        throw new Error(`Unexpected SQL in fake QueryRunner: ${sql}`);
      },
    } as any;
  }
}

describe('AddForumCategoriesNewsletterTipsTricks migration (1788300000000)', () => {
  const migration = new AddForumCategoriesNewsletterTipsTricks1788300000000();

  it('exports the expected class', () => {
    expect(migration).toBeDefined();
    expect(typeof migration.up).toBe('function');
    expect(typeof migration.down).toBe('function');
  });

  const canonicalFull =
    'releases,newsletter,tips-and-tricks,help,platform-functionalities,community-building,challenge-centric,other';

  it('up() adds both new categories and reorders a legacy 6-value row into canonical order', async () => {
    const table = new FakeForumAndPlatformTables({
      forums: {
        'forum-1':
          'releases,platform-functionalities,community-building,challenge-centric,help,other',
      },
      platformForumId: 'forum-1',
    });

    await migration.up(table.asQueryRunner());

    expect(table.get('forum-1')).toBe(canonicalFull);
  });

  it('up() is idempotent — running it twice yields the same canonical-order 8 values', async () => {
    const table = new FakeForumAndPlatformTables({
      forums: {
        'forum-1':
          'releases,platform-functionalities,community-building,challenge-centric,help,other',
      },
      platformForumId: 'forum-1',
    });

    await migration.up(table.asQueryRunner());
    await migration.up(table.asQueryRunner());

    expect(table.get('forum-1')).toBe(canonicalFull);
    expect(table.get('forum-1')!.split(',')).toHaveLength(8);
  });

  it('up() appends an unknown hand-edited value after the known ones, and still adds the two new categories', async () => {
    const table = new FakeForumAndPlatformTables({
      forums: { 'forum-1': 'releases,legacy-unknown-category' },
      platformForumId: 'forum-1',
    });

    await migration.up(table.asQueryRunner());

    expect(table.get('forum-1')).toBe(
      'releases,newsletter,tips-and-tricks,legacy-unknown-category'
    );
  });

  it('up() skips a row that already carries both new values in canonical order', async () => {
    const table = new FakeForumAndPlatformTables({
      forums: { 'forum-1': canonicalFull },
      platformForumId: 'forum-1',
    });

    await migration.up(table.asQueryRunner());

    expect(table.get('forum-1')).toBe(canonicalFull);
  });

  it('up() treats a null column as an empty list and adds both values with nothing else to reorder', async () => {
    const table = new FakeForumAndPlatformTables({
      forums: { 'forum-1': null },
      platformForumId: 'forum-1',
    });

    await migration.up(table.asQueryRunner());

    expect(table.get('forum-1')).toBe('newsletter,tips-and-tricks');
  });

  it('up() is retirement-safe — a column missing a retired category does not regain it', async () => {
    const table = new FakeForumAndPlatformTables({
      forums: {
        // "help" was retired via adminForumRemoveDiscussionCategory before
        // this migration ran.
        'forum-1':
          'releases,platform-functionalities,community-building,challenge-centric,other',
      },
      platformForumId: 'forum-1',
    });

    await migration.up(table.asQueryRunner());

    expect(table.get('forum-1')).toBe(
      'releases,newsletter,tips-and-tricks,platform-functionalities,community-building,challenge-centric,other'
    );
    expect(table.get('forum-1')).not.toContain('help');
  });

  it('down() removes exactly the two added values and leaves everything else untouched', async () => {
    const table = new FakeForumAndPlatformTables({
      forums: {
        'forum-1':
          'releases,platform-functionalities,community-building,challenge-centric,help,other,newsletter,tips-and-tricks',
      },
      platformForumId: 'forum-1',
    });

    await migration.down(table.asQueryRunner());

    expect(table.get('forum-1')).toBe(
      'releases,platform-functionalities,community-building,challenge-centric,help,other'
    );
  });

  it('down() preserves an unrelated hand-edited value while removing only the two added ones', async () => {
    const table = new FakeForumAndPlatformTables({
      forums: { 'forum-1': 'releases,legacy-unknown-category,newsletter,tips-and-tricks' },
      platformForumId: 'forum-1',
    });

    await migration.down(table.asQueryRunner());

    expect(table.get('forum-1')).toBe('releases,legacy-unknown-category');
  });

  it('up() takes a row lock on the Forum row it is about to rewrite', async () => {
    // The retirement mutation is live in the running server before this
    // manually-triggered migration runs, and writes the same column. Without
    // FOR UPDATE, a retirement committing between the read and the full-list
    // write would be silently overwritten and the category resurrected.
    const table = new FakeForumAndPlatformTables({
      forums: { 'forum-1': 'releases,other' },
      platformForumId: 'forum-1',
    });

    await migration.up(table.asQueryRunner());

    expect(table.selects()).toHaveLength(1);
    expect(table.selects()[0]).toContain('FOR UPDATE');
  });

  it('down() takes the same row lock', async () => {
    const table = new FakeForumAndPlatformTables({
      forums: { 'forum-1': 'releases,newsletter,tips-and-tricks' },
      platformForumId: 'forum-1',
    });

    await migration.down(table.asQueryRunner());

    expect(table.selects()).toHaveLength(1);
    expect(table.selects()[0]).toContain('FOR UPDATE');
  });

  it('down() is a no-op for a row that never carried the two values', async () => {
    const table = new FakeForumAndPlatformTables({
      forums: { 'forum-1': 'releases,other' },
      platformForumId: 'forum-1',
    });

    await migration.down(table.asQueryRunner());

    expect(table.get('forum-1')).toBe('releases,other');
  });

  it('up() resolves the platform Forum through platform."forumId", not by scanning every forum row, and leaves a non-platform forum byte-identical', async () => {
    const otherForumBefore =
      'releases,platform-functionalities,community-building';
    const table = new FakeForumAndPlatformTables({
      forums: {
        'platform-forum': 'releases,other',
        'other-forum': otherForumBefore,
      },
      platformForumId: 'platform-forum',
    });

    await migration.up(table.asQueryRunner());

    expect(table.get('platform-forum')).toBe(
      'releases,newsletter,tips-and-tricks,other'
    );
    expect(table.get('other-forum')).toBe(otherForumBefore);
    expect(table.selects()[0]).toMatch(/join\s+platform/i);
  });

  it('down() resolves the platform Forum through platform."forumId" and leaves a non-platform forum byte-identical, even if it also carries the two added values', async () => {
    const otherForumBefore = 'releases,newsletter,tips-and-tricks,other';
    const table = new FakeForumAndPlatformTables({
      forums: {
        'platform-forum':
          'releases,newsletter,tips-and-tricks,other',
        'other-forum': otherForumBefore,
      },
      platformForumId: 'platform-forum',
    });

    await migration.down(table.asQueryRunner());

    expect(table.get('platform-forum')).toBe('releases,other');
    expect(table.get('other-forum')).toBe(otherForumBefore);
  });

  it('up() is a clean no-op when no platform Forum resolves (e.g. platform."forumId" is NULL before bootstrap)', async () => {
    const otherForumBefore = 'releases,other';
    const table = new FakeForumAndPlatformTables({
      forums: { 'orphan-forum': otherForumBefore },
      // No platformForumId: simulates platform."forumId" IS NULL, or no
      // platform row at all.
    });

    await expect(migration.up(table.asQueryRunner())).resolves.not.toThrow();

    expect(table.get('orphan-forum')).toBe(otherForumBefore);
  });

  it('down() is a clean no-op when no platform Forum resolves', async () => {
    const otherForumBefore = 'releases,newsletter,tips-and-tricks';
    const table = new FakeForumAndPlatformTables({
      forums: { 'orphan-forum': otherForumBefore },
    });

    await expect(
      migration.down(table.asQueryRunner())
    ).resolves.not.toThrow();

    expect(table.get('orphan-forum')).toBe(otherForumBefore);
  });
});
