import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AddSearchSidebarWidget1788100000000 } from '../1788100000000-AddSearchSidebarWidget';

/**
 * Static-analysis assertions for the AddSearchSidebarWidget migration. These run without a
 * database connection by inspecting the migration source directly; the SQL was additionally
 * exercised against a disposable PostgreSQL container as a verification track (fixture
 * matrix, run twice), evidenced separately — not part of this committed gate.
 *
 * This migration's guard is deliberately different in shape from the prior sidebar backfill
 * migration's `sidebar IS NULL OR jsonb_typeof(...) <> 'array'` guard, which is now vacuous
 * (every row is already an array) and, more importantly, wrong for this migration's job:
 * this one must skip `null`/scalar/missing rows rather than repair them. So this spec asserts
 * the NEW guard shape and explicitly asserts the OLD guard's `IS NULL` clause is absent —
 * copying the prior migration's spec assertions here would pin the wrong invariant.
 */
describe('AddSearchSidebarWidget migration (1788100000000)', () => {
  const migrationSrc = readFileSync(
    resolve(__dirname, '../1788100000000-AddSearchSidebarWidget.ts'),
    'utf8'
  );

  it('exports the expected class', () => {
    expect(AddSearchSidebarWidget1788100000000).toBeDefined();
    const instance = new AddSearchSidebarWidget1788100000000();
    expect(typeof instance.up).toBe('function');
    expect(typeof instance.down).toBe('function');
  });

  it('migration class name includes the timestamp 1788100000000', () => {
    expect(migrationSrc).toMatch(/AddSearchSidebarWidget1788100000000/);
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

  it('evaluates jsonb_array_length exactly once in the executable SQL, only as the COALESCE append fallback — never as a WHERE gate (null-safety: a scalar/null "sidebar" would abort a WHERE that called it directly)', () => {
    const upBody = migrationSrc.slice(
      migrationSrc.indexOf('public async up'),
      migrationSrc.indexOf('public async down')
    );
    const occurrences = upBody.split('jsonb_array_length').length - 1;
    expect(occurrences).toBe(1);
    // Its one use sits inside the jsonb_insert index COALESCE, which is only evaluated for
    // rows the outer WHERE has already proven are non-empty arrays.
    expect(migrationSrc).toMatch(/COALESCE\(([\s\S]*?)jsonb_array_length\(/);
    // None of the three (identical) outer guard clauses reference it.
    const guardBlocks =
      migrationSrc.match(
        /WHERE jsonb_typeof\(settings -> 'sidebar'\) = 'array'[\s\S]*?'\["search"\]'::jsonb\)/g
      ) ?? [];
    expect(guardBlocks.length).toBe(3);
    for (const guard of guardBlocks) {
      expect(guard).not.toMatch(/jsonb_array_length/);
    }
  });

  it('anchor precedence inside the COALESCE: index-before-first-"index" comes before after-last-create-button, which comes before array-length append', () => {
    const coalesceStart = migrationSrc.indexOf('COALESCE(');
    const coalesceBody = migrationSrc.slice(coalesceStart);
    const indexAnchor = coalesceBody.indexOf("v = 'index'");
    const createButtonAnchor = coalesceBody.indexOf(
      "v IN ('createSubspace', 'createPost')"
    );
    const lengthAnchor = coalesceBody.indexOf('jsonb_array_length(');

    expect(indexAnchor).toBeGreaterThan(-1);
    expect(createButtonAnchor).toBeGreaterThan(-1);
    expect(lengthAnchor).toBeGreaterThan(-1);
    expect(indexAnchor).toBeLessThan(createButtonAnchor);
    expect(createButtonAnchor).toBeLessThan(lengthAnchor);
  });

  it('uses MIN(o) - 1 for the "index" anchor and MAX(o) for the create-button anchor', () => {
    expect(migrationSrc).toMatch(/MIN\(o\)\s*-\s*1[\s\S]*?v = 'index'/);
    expect(migrationSrc).toMatch(
      /MAX\(o\)[\s\S]*?v IN \('createSubspace', 'createPost'\)/
    );
  });

  it('exactly two SELECT COUNT(*) verification blocks, both carrying the same three-clause predicate', () => {
    const selectBlocks =
      migrationSrc.match(
        /SELECT COUNT\(\*\) AS count FROM innovation_flow_state[\s\S]*?`/g
      ) ?? [];
    expect(selectBlocks.length).toBe(2);
    for (const block of selectBlocks) {
      expect(block).toMatch(
        /jsonb_typeof\(settings\s*->\s*'sidebar'\)\s*=\s*'array'/
      );
      expect(block).toMatch(/settings\s*->\s*'sidebar'\s*<>\s*'\[\]'::jsonb/);
      expect(block).toMatch(
        /NOT\s*\(settings\s*->\s*'sidebar'\s*@>\s*'\["search"\]'::jsonb\)/
      );
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
