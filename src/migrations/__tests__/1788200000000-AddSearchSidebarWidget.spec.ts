import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AddSearchSidebarWidget1788200000000 } from '../1788200000000-AddSearchSidebarWidget';

/**
 * Intent-level static assertions for the AddSearchSidebarWidget migration (single guarded
 * UPDATE, null-safe guard, throwing residual check, no-op down, self-contained). They run
 * without a database by inspecting the migration source, and deliberately do NOT pin the
 * SQL's spelling: the placement rule itself lives as executable code in
 * `innovation.flow.state.sidebar.defaults.ts` (`insertSearchWidget`) and is unit-tested
 * there against the same truth table this migration documents; the SQL was exercised
 * against a disposable PostgreSQL container as a verification track, evidenced separately.
 *
 * This migration's guard is deliberately different in shape from the prior sidebar backfill
 * migration's `sidebar IS NULL OR jsonb_typeof(...) <> 'array'` guard, which is now vacuous
 * (every row is already an array) and, more importantly, wrong for this migration's job:
 * this one must skip `null`/scalar/missing rows rather than repair them. So this spec asserts
 * the NEW guard shape and explicitly asserts the OLD guard's `IS NULL` clause is absent —
 * copying the prior migration's spec assertions here would pin the wrong invariant.
 */
describe('AddSearchSidebarWidget migration (1788200000000)', () => {
  const migrationSrc = readFileSync(
    resolve(__dirname, '../1788200000000-AddSearchSidebarWidget.ts'),
    'utf8'
  );

  it('exports the expected class', () => {
    expect(AddSearchSidebarWidget1788200000000).toBeDefined();
    const instance = new AddSearchSidebarWidget1788200000000();
    expect(typeof instance.up).toBe('function');
    expect(typeof instance.down).toBe('function');
  });

  it('migration class name includes the timestamp 1788200000000', () => {
    expect(migrationSrc).toMatch(/AddSearchSidebarWidget1788200000000/);
  });

  it('contains exactly one UPDATE statement, using jsonb_insert and the "search" literal', () => {
    const sqlBlocks =
      migrationSrc.match(/await queryRunner\.query\(`([\s\S]*?)`\)/g) ?? [];
    const updateBlocks = sqlBlocks.filter(block =>
      /UPDATE\s+innovation_flow_state/i.test(block)
    );
    expect(updateBlocks.length).toBe(1);
    const [updateBlock] = updateBlocks;
    expect(updateBlock).toMatch(/jsonb_insert\(/);
    expect(updateBlock).toMatch(/'"search"'::jsonb/);
  });

  it('the UPDATE is guarded by the null-safe three-clause predicate, not the prior backfill guard', () => {
    const sqlBlocks =
      migrationSrc.match(/await queryRunner\.query\(`([\s\S]*?)`\)/g) ?? [];
    const updateBlock = sqlBlocks.find(block =>
      /UPDATE\s+innovation_flow_state/i.test(block)
    ) as string;
    // The outer guard is the LAST "WHERE" in the block — the two earlier ones belong to the
    // COALESCE's own anchor subqueries (WHERE v = 'index' / WHERE v IN (...)).
    const afterWhere = updateBlock.slice(updateBlock.lastIndexOf('WHERE'));

    expect(afterWhere).toMatch(
      /jsonb_typeof\(settings\s*->\s*'sidebar'\)\s*=\s*'array'/
    );
    expect(afterWhere).toMatch(/settings\s*->\s*'sidebar'\s*<>\s*'\[\]'::jsonb/);
    expect(afterWhere).toMatch(
      /NOT\s*\(settings\s*->\s*'sidebar'\s*@>\s*'\["search"\]'::jsonb\)/
    );
  });

  it('never guards on the vacuous prior backfill predicate (IS NULL over sidebar)', () => {
    expect(migrationSrc).not.toMatch(/sidebar'\s*IS NULL/i);
  });

  it('never calls jsonb_array_length in a WHERE guard (null-safety: it aborts the statement on a scalar/null "sidebar")', () => {
    // Every WHERE that gates on the sidebar column must stay free of it; its only legitimate
    // place is inside the jsonb_insert index COALESCE, reached solely for proven arrays.
    const guardBlocks =
      migrationSrc.match(
        /WHERE jsonb_typeof\(settings -> 'sidebar'\) = 'array'[\s\S]*?'\["search"\]'::jsonb\)/g
      ) ?? [];
    expect(guardBlocks.length).toBeGreaterThan(0);
    for (const guard of guardBlocks) {
      expect(guard).not.toMatch(/jsonb_array_length/);
    }
  });

  it('the residual verification throws (rolls back) instead of warning', () => {
    const verifySection = migrationSrc.slice(
      migrationSrc.indexOf('count: residual')
    );
    expect(verifySection).toMatch(/throw new Error\(/);
    expect(verifySection).not.toMatch(/console\.warn/);
  });

  it('down() is an intentional no-op (additive content, never stripped)', () => {
    const downSection = migrationSrc.slice(
      migrationSrc.indexOf('public async down')
    );
    expect(downSection).not.toMatch(/\bUPDATE\b/i);
    expect(downSection).not.toMatch(/queryRunner\.query/);
  });

  it('is self-contained: no application imports besides typeorm', () => {
    const importLines = migrationSrc
      .split('\n')
      .filter(line => line.trim().startsWith('import '));
    for (const line of importLines) {
      expect(line).toMatch(/from 'typeorm'/);
    }
  });
});
