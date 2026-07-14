/**
 * Integration tests: BackfillInnovationFlowStateLayout migration
 * (feature 021-flow-state-post-layout, FR-009)
 *
 * These tests verify the SQL structure of the three UP statements:
 *   1. Branch A (space-owned states via JOIN) only touches rows where
 *      `descriptionDisplayMode` is absent.
 *   2. Branch B (remaining states) only touches rows where
 *      `descriptionDisplayMode` is still absent after branch A.
 *   3. All-states pass sets `showPublishDetails` only where absent.
 *
 * All assertions are SQL-string structural — the real-database stack is not
 * available in CI unit mode, consistent with the callout-collapse precedent.
 * Use the live migration:validate harness for full DB coverage (US4-AS1..AS5).
 */

import { BackfillInnovationFlowStateLayout1783600000000 } from '@src/migrations/1783600000000-BackfillInnovationFlowStateLayout';

describe('BackfillInnovationFlowStateLayout migration', () => {
  const migration = new BackfillInnovationFlowStateLayout1783600000000();

  it('migration class implements MigrationInterface (has up and down methods)', () => {
    expect(typeof migration.up).toBe('function');
    expect(typeof migration.down).toBe('function');
  });

  // -------------------------------------------------------------------------
  // UP — Branch A (space-owned via JOIN)
  // -------------------------------------------------------------------------

  it('Branch A UP query joins space → collaboration → innovation_flow_state and guards descriptionDisplayMode absent', async () => {
    const queriedSql: string[] = [];
    const mockQueryRunner = {
      query: (sql: string) => {
        queriedSql.push(sql);
        return Promise.resolve(undefined);
      },
    } as any;

    await migration.up(mockQueryRunner);

    // Branch A is the first query
    const branchA = queriedSql[0];
    expect(branchA).toContain('collaboration');
    expect(branchA).toContain('space');
    expect(branchA).toContain('innovationFlowId');
    expect(branchA).toContain(`'descriptionDisplayMode'`);
    expect(branchA).toContain(`IS NULL`);
    expect(branchA).toContain('descriptionDisplayMode');
    // Value comes from space settings with COALESCE fallback
    expect(branchA).toContain('calloutDescriptionDisplayMode');
    expect(branchA).toContain('COALESCE');
    expect(branchA).toContain("'expanded'");
  });

  it('Branch A UP is idempotent: WHERE guards only rows where descriptionDisplayMode is absent (US4-AS4)', async () => {
    const queriedSql: string[] = [];
    const mockQueryRunner = {
      query: (sql: string) => {
        queriedSql.push(sql);
        return Promise.resolve(undefined);
      },
    } as any;

    await migration.up(mockQueryRunner);

    // The WHERE clause must contain IS NULL guard so a second run skips already-set rows
    const branchA = queriedSql[0];
    expect(branchA).toMatch(/descriptionDisplayMode.*IS NULL/s);
  });

  // -------------------------------------------------------------------------
  // UP — Branch B (remaining states)
  // -------------------------------------------------------------------------

  it('Branch B UP only touches rows where descriptionDisplayMode is still absent (US4-AS3)', async () => {
    const queriedSql: string[] = [];
    const mockQueryRunner = {
      query: (sql: string) => {
        queriedSql.push(sql);
        return Promise.resolve(undefined);
      },
    } as any;

    await migration.up(mockQueryRunner);

    const branchB = queriedSql[1];
    expect(branchB).toContain(`'descriptionDisplayMode'`);
    expect(branchB).toContain(`IS NULL`);
    expect(branchB).toContain('"expanded"');
  });

  // -------------------------------------------------------------------------
  // UP — showPublishDetails (all states)
  // -------------------------------------------------------------------------

  it('showPublishDetails UP only touches rows where the key is absent and sets true (FR-002)', async () => {
    const queriedSql: string[] = [];
    const mockQueryRunner = {
      query: (sql: string) => {
        queriedSql.push(sql);
        return Promise.resolve(undefined);
      },
    } as any;

    await migration.up(mockQueryRunner);

    const showPublishQuery = queriedSql[2];
    expect(showPublishQuery).toContain(`'showPublishDetails'`);
    expect(showPublishQuery).toContain(`IS NULL`);
    expect(showPublishQuery).toContain('true');
  });

  it('up() executes exactly 3 queries (branch A, branch B, showPublishDetails)', async () => {
    let callCount = 0;
    const mockQueryRunner = {
      query: () => {
        callCount++;
        return Promise.resolve(undefined);
      },
    } as any;

    await migration.up(mockQueryRunner);

    expect(callCount).toBe(3);
  });

  // -------------------------------------------------------------------------
  // DOWN
  // -------------------------------------------------------------------------

  it('down() is a non-destructive no-op — it never strips the additive keys (data safety)', async () => {
    // The keys are additive and editable after the migration; rolling back must NOT delete
    // admin edits, so down() issues no UPDATE/strip queries.
    const queriedSql: string[] = [];
    const mockQueryRunner = {
      query: (sql: string) => {
        queriedSql.push(sql);
        return Promise.resolve(undefined);
      },
    } as any;

    await expect(migration.down(mockQueryRunner)).resolves.not.toThrow();
    expect(queriedSql).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Re-run structural guard (US4-AS4)
  //
  // NOTE: these unit tests use a mock QueryRunner and therefore verify the SQL is
  // *structurally* guarded (every UP statement carries a `settings -> '<key>' IS NULL`
  // WHERE clause — see the Branch A/B/showPublishDetails tests above), which is what makes
  // a re-run a no-op. RUNTIME idempotency against real rows is verified live by the
  // migration validation harness (`pnpm run migration:validate`) — a mock cannot prove it.
  // -------------------------------------------------------------------------

  it('up() re-run issues the same guarded statements (structural idempotency; runtime proven by migration:validate)', async () => {
    let callCount = 0;
    const mockQueryRunner = {
      query: () => {
        callCount++;
        return Promise.resolve(undefined);
      },
    } as any;

    await migration.up(mockQueryRunner);
    await migration.up(mockQueryRunner);

    // 3 guarded statements per run × 2 runs = 6
    expect(callCount).toBe(6);
  });
});
