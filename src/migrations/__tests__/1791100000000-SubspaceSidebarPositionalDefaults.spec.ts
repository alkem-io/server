import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  resolveSubspaceDefaultSidebar,
  SIDEBAR_DEFAULT_GENERIC,
} from '@domain/collaboration/innovation-flow-state/innovation.flow.state.sidebar.defaults';
import { describe, expect, it } from 'vitest';
import { SubspaceSidebarPositionalDefaults1791100000000 } from '../1791100000000-SubspaceSidebarPositionalDefaults';

/**
 * Intent-level static assertions for the SubspaceSidebarPositionalDefaults migration: one
 * positional UPDATE over untouched L1/L2 flows (spaces and templates), a null-safe untouched
 * predicate, a throwing residual check, a no-op down, and no application imports. They run
 * without a database by inspecting the migration source. This spec is also the one place
 * the migration's SQL literals are tied to application code: each CASE literal must equal
 * `resolveSubspaceDefaultSidebar(position)`. The SQL itself is exercised against a
 * disposable PostgreSQL as a separate verification track.
 */
describe('SubspaceSidebarPositionalDefaults migration (1791100000000)', () => {
  const migrationSrc = readFileSync(
    resolve(
      __dirname,
      '../1791100000000-SubspaceSidebarPositionalDefaults.ts'
    ),
    'utf8'
  );
  const sqlBlocks =
    migrationSrc.match(/await queryRunner\.query\(`([\s\S]*?)`\)/g) ?? [];
  const updateBlocks = sqlBlocks.filter(block =>
    /UPDATE\s+innovation_flow_state/i.test(block)
  );
  const sharedCtes = migrationSrc.slice(
    migrationSrc.indexOf('const OWNED_AND_UNTOUCHED_FLOWS'),
    migrationSrc.indexOf('`;', migrationSrc.indexOf('const OWNED_AND_UNTOUCHED_FLOWS'))
  );

  it('exports the expected class with up and down', () => {
    const instance = new SubspaceSidebarPositionalDefaults1791100000000();
    expect(typeof instance.up).toBe('function');
    expect(typeof instance.down).toBe('function');
    expect(instance.name).toBe('SubspaceSidebarPositionalDefaults1791100000000');
    expect(migrationSrc).toMatch(/SubspaceSidebarPositionalDefaults1791100000000/);
  });

  it('contains exactly one UPDATE, a positional jsonb_set ranked by (sortOrder, id)', () => {
    expect(updateBlocks.length).toBe(1);
    const [updateBlock] = updateBlocks;
    expect(updateBlock).toMatch(/jsonb_set\(/);
    expect(updateBlock).toMatch(/ROW_NUMBER\(\) OVER/);
    expect(updateBlock).toMatch(
      /ORDER BY ifs\."sortOrder" ASC, ifs\.id ASC/
    );
    // every UPDATE target is restricted to the untouched set
    expect(updateBlock).toMatch(/JOIN untouched u/);
    expect(updateBlock).toMatch(/\$\{OWNED_AND_UNTOUCHED_FLOWS\}/);
  });

  it('scopes ownership to L1/L2 spaces and L1/L2 template content spaces only', () => {
    expect(sharedCtes).toMatch(
      /JOIN space s ON s\."collaborationId" = c\.id AND s\.level IN \(1, 2\)/
    );
    expect(sharedCtes).toMatch(
      /JOIN template_content_space tcs ON tcs\."collaborationId" = c\.id AND tcs\.level IN \(1, 2\)/
    );
    expect(migrationSrc).not.toMatch(/level\s*=\s*0/);
    expect(migrationSrc).not.toMatch(/level IN \(0/);
  });

  it('uses the null-safe untouched predicate and never an array-length function', () => {
    expect(sharedCtes).toMatch(/bool_and\(/);
    expect(sharedCtes).toMatch(
      /jsonb_typeof\(ifs\.settings -> 'sidebar'\) IS DISTINCT FROM 'array'/
    );
    expect(sharedCtes).toContain(
      `ifs.settings -> 'sidebar' = '${JSON.stringify([...SIDEBAR_DEFAULT_GENERIC])}'::jsonb`
    );
    expect(migrationSrc).not.toMatch(/jsonb_array_length/);
  });

  it('the CASE literals equal resolveSubspaceDefaultSidebar for every position', () => {
    const [updateBlock] = updateBlocks;
    const whenLiterals = [
      ...updateBlock.matchAll(/WHEN (\d+) THEN '([^']+)'::jsonb/g),
    ];
    expect(whenLiterals.map(match => Number(match[1]))).toEqual([1, 2, 3]);
    for (const [, position, json] of whenLiterals) {
      expect(JSON.parse(json)).toEqual([
        ...resolveSubspaceDefaultSidebar(Number(position)),
      ]);
    }

    const elseLiteral = updateBlock.match(/ELSE '([^']+)'::jsonb/);
    expect(elseLiteral).not.toBeNull();
    expect(JSON.parse((elseLiteral as RegExpMatchArray)[1])).toEqual([
      ...SIDEBAR_DEFAULT_GENERIC,
    ]);
    expect(resolveSubspaceDefaultSidebar(4)).toBe(SIDEBAR_DEFAULT_GENERIC);
  });

  it('logs the in-scope, rewritten and skipped counts', () => {
    expect(migrationSrc).toMatch(/in-scope L1\/L2 flows = /);
    expect(migrationSrc).toMatch(/untouched \(to rewrite\) = /);
    expect(migrationSrc).toMatch(/skipped \(touched, will render stored lists\) = /);
  });

  it('the residual verification throws (rolls back) instead of warning', () => {
    const verifySection = migrationSrc.slice(
      migrationSrc.indexOf('count: residual')
    );
    expect(verifySection).toMatch(/FROM untouched/);
    expect(verifySection).toMatch(/throw new Error\(/);
    expect(verifySection).not.toMatch(/console\.warn/);
  });

  it('down() is an intentional no-op', () => {
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
    expect(importLines.length).toBeGreaterThan(0);
    for (const line of importLines) {
      expect(line).toMatch(/from 'typeorm'/);
    }
  });
});
