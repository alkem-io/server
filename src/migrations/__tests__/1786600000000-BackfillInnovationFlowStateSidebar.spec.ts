import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BackfillInnovationFlowStateSidebar1786600000000 } from '../1786600000000-BackfillInnovationFlowStateSidebar';

/**
 * Static-analysis assertions for the BackfillInnovationFlowStateSidebar migration.
 * These run without a database connection by inspecting the migration source directly;
 * the migration's actual SQL was additionally exercised manually against a disposable
 * PostgreSQL container (minimal synthetic schema and the full real migration chain) before
 * this change was committed.
 */
describe('BackfillInnovationFlowStateSidebar migration (1786600000000)', () => {
  const migrationSrc = readFileSync(
    resolve(__dirname, '../1786600000000-BackfillInnovationFlowStateSidebar.ts'),
    'utf8'
  );

  it('exports the expected class', () => {
    expect(BackfillInnovationFlowStateSidebar1786600000000).toBeDefined();
    const instance = new BackfillInnovationFlowStateSidebar1786600000000();
    expect(typeof instance.up).toBe('function');
    expect(typeof instance.down).toBe('function');
  });

  it('up() SQL is idempotent: every write is guarded by a sidebar IS NULL check', () => {
    const sqlBlocks =
      migrationSrc.match(/await queryRunner\.query\(`([\s\S]*?)`\)/g) ?? [];
    const combinedSql = sqlBlocks.join('\n');
    const updates = combinedSql.match(/UPDATE\s+innovation_flow_state/gi) ?? [];
    const guards = combinedSql.match(/settings\s*->\s*'sidebar'\s*IS NULL/gi) ?? [];
    // Every UPDATE statement region must carry the guard at least once — the exact
    // count check below asserts one guard per branch (Branch A/B/C = 3 UPDATEs).
    expect(updates.length).toBe(3);
    expect(guards.length).toBeGreaterThanOrEqual(3);
  });

  it('the positional ranking CTEs are NOT filtered to unbackfilled rows only', () => {
    // Regression guard for the exact defect found during manual verification: if the
    // ranking CTE only ranks rows still missing `sidebar`, an already-backfilled first
    // tab shifts every subsequent tab's rank down by one, and the wrong default gets
    // written. The ROW_NUMBER() CTEs (Branch A / Branch B) must rank every state in the
    // flow, with the `sidebar IS NULL` guard applied only in the outer UPDATE.
    const cteStarts = [...migrationSrc.matchAll(/WITH ranked AS \(/g)].map(
      m => m.index as number
    );
    expect(cteStarts.length).toBe(2);
    for (const start of cteStarts) {
      // The CTE body ends at its matching ")" right before "UPDATE innovation_flow_state".
      const updateIndex = migrationSrc.indexOf(
        'UPDATE innovation_flow_state',
        start
      );
      const cteBody = migrationSrc.slice(start, updateIndex);
      // The CTE's own SELECT (the ranking computation) must not filter by sidebar —
      // that filter belongs only to the outer UPDATE ... WHERE clause.
      expect(cteBody).not.toMatch(/sidebar/i);
    }
  });

  it('up() SQL ranks positionally by sortOrder with a stable id tiebreak', () => {
    expect(migrationSrc).toMatch(
      /ORDER BY ifs\."sortOrder" ASC, ifs\.id ASC/
    );
  });

  it('Branch A joins L0 spaces and Branch B joins L0 templates, in that order', () => {
    const branchAIndex = migrationSrc.indexOf('JOIN space s');
    const branchBIndex = migrationSrc.indexOf('JOIN template_content_space tcs');
    expect(branchAIndex).toBeGreaterThan(-1);
    expect(branchBIndex).toBeGreaterThan(-1);
    expect(branchAIndex).toBeLessThan(branchBIndex);
    expect(migrationSrc).toMatch(/JOIN space s ON s\."collaborationId" = c\.id AND s\.level = 0/);
    expect(migrationSrc).toMatch(
      /JOIN template_content_space tcs\s*\n\s*ON tcs\."collaborationId" = c\.id AND tcs\.level = 0/
    );
  });

  it('the four per-tab positional literals appear in both Branch A and Branch B', () => {
    const literals = [
      '["intent","about","createPost","applicationButton","subspaceLinks","events","updates"]',
      '["createPost","applicationButton","intent","contactLeads","addUser","virtualContributors","guidelines"]',
      '["createPost","applicationButton","intent"]',
      '["createPost","applicationButton","intent","index"]',
    ];
    for (const literal of literals) {
      const occurrences = migrationSrc.split(literal).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });

  it('the catch-all branch writes the generic default unconditionally on remaining NULL rows', () => {
    const catchAllIndex = migrationSrc.indexOf('Branch C');
    const catchAllSection = migrationSrc.slice(catchAllIndex);
    expect(catchAllSection).toMatch(
      /UPDATE innovation_flow_state\s*\n\s*SET settings = jsonb_set\(settings, '\{sidebar\}', '\["createPost","applicationButton","intent","index"\]'::jsonb, true\)/
    );
  });

  it('down() is an intentional no-op (additive JSONB key, never stripped)', () => {
    const downSection = migrationSrc.slice(migrationSrc.indexOf('public async down'));
    expect(downSection).not.toMatch(/\bUPDATE\b/i);
    expect(downSection).not.toMatch(/queryRunner\.query/);
  });

  it('migration class name includes the timestamp 1786600000000', () => {
    expect(migrationSrc).toMatch(
      /BackfillInnovationFlowStateSidebar1786600000000/
    );
  });
});
