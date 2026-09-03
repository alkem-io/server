import { AddForumCategoriesNewsletterTipsTricks1788300000000 } from '../1788300000000-AddForumCategoriesNewsletterTipsTricks';

/**
 * Behavioral spec against a minimal in-memory fake of `QueryRunner` — the
 * migration only ever issues a `SELECT id, "discussionCategories" FROM
 * forum` and, per drifted row, a parameterized `UPDATE forum SET
 * "discussionCategories" = $1 WHERE id = $2`, so a tiny row-store fake
 * exercises the real up()/down() logic (reorder-to-canonical-and-add /
 * remove-if-present) without a live PostgreSQL container.
 */
class FakeForumTable {
  private rows = new Map<string, string | null>();
  readonly statements: string[] = [];

  constructor(seed: Record<string, string | null>) {
    for (const [id, value] of Object.entries(seed)) {
      this.rows.set(id, value);
    }
  }

  get(id: string): string | null {
    return this.rows.get(id) ?? null;
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
          return Array.from(this.rows.entries()).map(
            ([id, discussionCategories]) => ({ id, discussionCategories })
          );
        }
        if (statement.startsWith('UPDATE')) {
          const [updated, id] = params as [string, string];
          this.rows.set(id, updated);
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
    const table = new FakeForumTable({
      'forum-1':
        'releases,platform-functionalities,community-building,challenge-centric,help,other',
    });

    await migration.up(table.asQueryRunner());

    expect(table.get('forum-1')).toBe(canonicalFull);
  });

  it('up() is idempotent — running it twice yields the same canonical-order 8 values', async () => {
    const table = new FakeForumTable({
      'forum-1':
        'releases,platform-functionalities,community-building,challenge-centric,help,other',
    });

    await migration.up(table.asQueryRunner());
    await migration.up(table.asQueryRunner());

    expect(table.get('forum-1')).toBe(canonicalFull);
    expect(table.get('forum-1')!.split(',')).toHaveLength(8);
  });

  it('up() appends an unknown hand-edited value after the known ones, and still adds the two new categories', async () => {
    const table = new FakeForumTable({
      'forum-1': 'releases,legacy-unknown-category',
    });

    await migration.up(table.asQueryRunner());

    expect(table.get('forum-1')).toBe(
      'releases,newsletter,tips-and-tricks,legacy-unknown-category'
    );
  });

  it('up() skips a row that already carries both new values in canonical order', async () => {
    const table = new FakeForumTable({ 'forum-1': canonicalFull });

    await migration.up(table.asQueryRunner());

    expect(table.get('forum-1')).toBe(canonicalFull);
  });

  it('up() treats a null column as an empty list and adds both values with nothing else to reorder', async () => {
    const table = new FakeForumTable({ 'forum-1': null });

    await migration.up(table.asQueryRunner());

    expect(table.get('forum-1')).toBe('newsletter,tips-and-tricks');
  });

  it('up() is retirement-safe — a column missing a retired category does not regain it', async () => {
    const table = new FakeForumTable({
      // "help" was retired via adminForumRemoveDiscussionCategory before this
      // migration ran.
      'forum-1': 'releases,platform-functionalities,community-building,challenge-centric,other',
    });

    await migration.up(table.asQueryRunner());

    expect(table.get('forum-1')).toBe(
      'releases,newsletter,tips-and-tricks,platform-functionalities,community-building,challenge-centric,other'
    );
    expect(table.get('forum-1')).not.toContain('help');
  });

  it('down() removes exactly the two added values and leaves everything else untouched', async () => {
    const table = new FakeForumTable({
      'forum-1':
        'releases,platform-functionalities,community-building,challenge-centric,help,other,newsletter,tips-and-tricks',
    });

    await migration.down(table.asQueryRunner());

    expect(table.get('forum-1')).toBe(
      'releases,platform-functionalities,community-building,challenge-centric,help,other'
    );
  });

  it('down() preserves an unrelated hand-edited value while removing only the two added ones', async () => {
    const table = new FakeForumTable({
      'forum-1': 'releases,legacy-unknown-category,newsletter,tips-and-tricks',
    });

    await migration.down(table.asQueryRunner());

    expect(table.get('forum-1')).toBe('releases,legacy-unknown-category');
  });

  it('up() takes a row lock on the Forum row it is about to rewrite', async () => {
    // The retirement mutation is live in the running server before this
    // manually-triggered migration runs, and writes the same column. Without
    // FOR UPDATE, a retirement committing between the read and the full-list
    // write would be silently overwritten and the category resurrected.
    const table = new FakeForumTable({ 'forum-1': 'releases,other' });

    await migration.up(table.asQueryRunner());

    expect(table.selects()).toHaveLength(1);
    expect(table.selects()[0]).toContain('FOR UPDATE');
  });

  it('down() takes the same row lock', async () => {
    const table = new FakeForumTable({
      'forum-1': 'releases,newsletter,tips-and-tricks',
    });

    await migration.down(table.asQueryRunner());

    expect(table.selects()).toHaveLength(1);
    expect(table.selects()[0]).toContain('FOR UPDATE');
  });

  it('down() is a no-op for a row that never carried the two values', async () => {
    const table = new FakeForumTable({ 'forum-1': 'releases,other' });

    await migration.down(table.asQueryRunner());

    expect(table.get('forum-1')).toBe('releases,other');
  });
});
