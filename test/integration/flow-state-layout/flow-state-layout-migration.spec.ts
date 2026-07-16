/**
 * Integration tests: BackfillInnovationFlowStateLayout migration
 * (feature 021-flow-state-post-layout, FR-009)
 *
 * SCOPE AND LIMITS — read before adding assertions here.
 *
 * These tests use a mock QueryRunner and assert on the SQL *text*. That is enough to pin
 * structural properties that are cheap to break and expensive to lose:
 *   - each UPDATE carries its `settings -> '<key>' IS NULL` guard (what makes a re-run a no-op)
 *   - the source value is allow-listed rather than copied verbatim into a NonNull enum
 *   - branch ORDER: the space and template branches must both precede the blanket-'expanded'
 *     branch, or they can never match anything and the migration silently defaults everything
 *
 * It is NOT enough to prove the migration does the right thing to real rows — a substring
 * assertion passes for a wrong JOIN column just as happily as a right one. Data-level
 * behaviour (US4-AS1..AS4) is proven against a seeded PostgreSQL by
 * `.scripts/migrations/verify_021_backfill.sh`; see that script's output for the evidence.
 */

import { BackfillInnovationFlowStateLayout1783600000000 } from '@src/migrations/1783600000000-BackfillInnovationFlowStateLayout';

/** Mock runner: SELECT COUNT(*) probes must return a rows array, UPDATEs return nothing. */
const createMockQueryRunner = () => {
  const queriedSql: string[] = [];
  return {
    queriedSql,
    runner: {
      query: (sql: string) => {
        queriedSql.push(sql);
        return Promise.resolve([{ count: '0' }]);
      },
    } as any,
  };
};

/** The UPDATE statements, in execution order, with the COUNT(*) probes filtered out. */
const updatesFrom = (queriedSql: string[]) =>
  queriedSql.filter(sql => sql.includes('UPDATE'));

describe('BackfillInnovationFlowStateLayout migration', () => {
  const migration = new BackfillInnovationFlowStateLayout1783600000000();

  it('migration class implements MigrationInterface (has up and down methods)', () => {
    expect(typeof migration.up).toBe('function');
    expect(typeof migration.down).toBe('function');
  });

  // -------------------------------------------------------------------------
  // UP — Branch A (space-owned via JOIN)
  // -------------------------------------------------------------------------

  it('Branch A joins space → collaboration → innovation_flow_state and guards descriptionDisplayMode absent', async () => {
    const { runner, queriedSql } = createMockQueryRunner();

    await migration.up(runner);

    const [branchA] = updatesFrom(queriedSql);
    expect(branchA).toContain('JOIN space s ON s."collaborationId" = c.id');
    expect(branchA).toContain('ifs."innovationFlowId" = c."innovationFlowId"');
    expect(branchA).toContain('calloutDescriptionDisplayMode');
    expect(branchA).toMatch(/descriptionDisplayMode.*IS NULL/s);
  });

  // -------------------------------------------------------------------------
  // UP — Branch A2 (template-owned via JOIN) — M1
  // -------------------------------------------------------------------------

  it('Branch A2 copies the template content space layout instead of defaulting it away (M1)', async () => {
    const { runner, queriedSql } = createMockQueryRunner();

    await migration.up(runner);

    const branchA2 = updatesFrom(queriedSql)[1];
    expect(branchA2).toContain(
      'JOIN template_content_space tcs ON tcs."collaborationId" = c.id'
    );
    expect(branchA2).toContain(
      "tcs.settings->'layout'->>'calloutDescriptionDisplayMode'"
    );
    expect(branchA2).toMatch(/descriptionDisplayMode.*IS NULL/s);
  });

  it('the space and template branches both run BEFORE the blanket-expanded branch, or they could never match', async () => {
    const { runner, queriedSql } = createMockQueryRunner();

    await migration.up(runner);

    const updates = updatesFrom(queriedSql);
    const spaceBranch = updates.findIndex(sql => sql.includes('JOIN space'));
    const templateBranch = updates.findIndex(sql =>
      sql.includes('JOIN template_content_space')
    );
    const blanketBranch = updates.findIndex(sql =>
      sql.includes(`'"expanded"'::jsonb`)
    );

    expect(spaceBranch).toBeGreaterThanOrEqual(0);
    expect(templateBranch).toBeGreaterThanOrEqual(0);
    expect(blanketBranch).toBeGreaterThan(spaceBranch);
    expect(blanketBranch).toBeGreaterThan(templateBranch);
  });

  it('allow-lists the copied value rather than trusting the stored string (m6)', async () => {
    const { runner, queriedSql } = createMockQueryRunner();

    await migration.up(runner);

    // Both JOIN branches feed a NonNull GraphQL enum; an out-of-enum legacy value would
    // break the tab query for every viewer of that space.
    for (const branch of updatesFrom(queriedSql).filter(sql =>
      sql.includes('JOIN')
    )) {
      expect(branch).toContain("IN ('expanded', 'collapsed')");
      expect(branch).toContain("ELSE 'expanded'");
    }
  });

  // -------------------------------------------------------------------------
  // UP — Branch B + showPublishDetails
  // -------------------------------------------------------------------------

  it('Branch B only touches rows where descriptionDisplayMode is still absent (US4-AS3)', async () => {
    const { runner, queriedSql } = createMockQueryRunner();

    await migration.up(runner);

    const branchB = updatesFrom(queriedSql)[2];
    expect(branchB).toContain(`'descriptionDisplayMode'`);
    expect(branchB).toContain('IS NULL');
    expect(branchB).toContain('"expanded"');
  });

  it('showPublishDetails only touches rows where the key is absent and sets true (FR-002)', async () => {
    const { runner, queriedSql } = createMockQueryRunner();

    await migration.up(runner);

    const showPublishQuery = updatesFrom(queriedSql)[3];
    expect(showPublishQuery).toContain(`'showPublishDetails'`);
    expect(showPublishQuery).toContain('IS NULL');
    expect(showPublishQuery).toContain('true');
  });

  it('every UPDATE is guarded so a re-run is a no-op (structural idempotency, US4-AS4)', async () => {
    const { runner, queriedSql } = createMockQueryRunner();

    await migration.up(runner);

    const updates = updatesFrom(queriedSql);
    expect(updates).toHaveLength(4);
    for (const sql of updates) {
      expect(sql).toContain('IS NULL');
    }
  });

  // -------------------------------------------------------------------------
  // DOWN
  // -------------------------------------------------------------------------

  it('down() is a non-destructive no-op — it never strips the additive keys (data safety)', async () => {
    // The keys are additive and editable after the migration; rolling back must NOT delete
    // admin edits, so down() issues no UPDATE/strip queries.
    const { runner, queriedSql } = createMockQueryRunner();

    await expect(migration.down(runner)).resolves.not.toThrow();
    expect(queriedSql).toHaveLength(0);
  });
});
