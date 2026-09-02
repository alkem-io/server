import { AddForumCategoriesNewsletterTipsTricks1788300000000 } from '../1788300000000-AddForumCategoriesNewsletterTipsTricks';

/**
 * Behavioral spec against a minimal in-memory fake of `QueryRunner` — the
 * migration only ever issues a `SELECT id, "discussionCategories" FROM
 * forum` and, per drifted row, a parameterized `UPDATE forum SET
 * "discussionCategories" = $1 WHERE id = $2`, so a tiny row-store fake
 * exercises the real up()/down() logic (append-if-missing / remove-if-
 * present) without a live PostgreSQL container.
 */
class FakeForumTable {
  private rows = new Map<string, string | null>();

  constructor(seed: Record<string, string | null>) {
    for (const [id, value] of Object.entries(seed)) {
      this.rows.set(id, value);
    }
  }

  get(id: string): string | null {
    return this.rows.get(id) ?? null;
  }

  asQueryRunner() {
    return {
      query: async (sql: string, params?: unknown[]) => {
        const statement = sql.trim();
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

  it('up() appends both new categories, in order, to a legacy 6-value row', async () => {
    const table = new FakeForumTable({
      'forum-1':
        'releases,platform-functionalities,community-building,challenge-centric,help,other',
    });

    await migration.up(table.asQueryRunner());

    expect(table.get('forum-1')).toBe(
      'releases,platform-functionalities,community-building,challenge-centric,help,other,newsletter,tips-and-tricks'
    );
  });

  it('up() is idempotent — running it twice yields the same 8 values', async () => {
    const table = new FakeForumTable({
      'forum-1':
        'releases,platform-functionalities,community-building,challenge-centric,help,other',
    });
    const expected =
      'releases,platform-functionalities,community-building,challenge-centric,help,other,newsletter,tips-and-tricks';

    await migration.up(table.asQueryRunner());
    await migration.up(table.asQueryRunner());

    expect(table.get('forum-1')).toBe(expected);
    expect(table.get('forum-1')!.split(',')).toHaveLength(8);
  });

  it('up() keeps an unknown hand-edited value untouched and still appends the two new ones', async () => {
    const table = new FakeForumTable({
      'forum-1': 'releases,legacy-unknown-category',
    });

    await migration.up(table.asQueryRunner());

    expect(table.get('forum-1')).toBe(
      'releases,legacy-unknown-category,newsletter,tips-and-tricks'
    );
  });

  it('up() skips a row that already carries both new values', async () => {
    const full =
      'releases,platform-functionalities,community-building,challenge-centric,help,other,newsletter,tips-and-tricks';
    const table = new FakeForumTable({ 'forum-1': full });

    await migration.up(table.asQueryRunner());

    expect(table.get('forum-1')).toBe(full);
  });

  it('up() treats a null column as an empty list and appends both values', async () => {
    const table = new FakeForumTable({ 'forum-1': null });

    await migration.up(table.asQueryRunner());

    expect(table.get('forum-1')).toBe('newsletter,tips-and-tricks');
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

  it('down() is a no-op for a row that never carried the two values', async () => {
    const table = new FakeForumTable({ 'forum-1': 'releases,other' });

    await migration.down(table.asQueryRunner());

    expect(table.get('forum-1')).toBe('releases,other');
  });
});
