import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AddCalloutSelectionSettings1784000000000 } from '../1784000000000-AddCalloutSelectionSettings';

/**
 * Static-analysis assertions for the AddCalloutSelectionSettings migration
 * (workspace#025-callout-manual-selection, T014 / FR-015 / US5-AS1..AS4).
 *
 * These tests can run without a database connection because they inspect the
 * migration source code directly rather than executing it.
 *
 * Mitigates R-3 (repos.yaml): validates that the migration is add-only,
 * scoped to collection kinds, and writes no authorization records.
 */
describe('AddCalloutSelectionSettings migration (1784000000000)', () => {
  const migrationSrc = readFileSync(
    resolve(
      __dirname,
      '../1784000000000-AddCalloutSelectionSettings.ts'
    ),
    'utf8'
  );

  it('exports the expected class', () => {
    expect(AddCalloutSelectionSettings1784000000000).toBeDefined();
    const instance = new AddCalloutSelectionSettings1784000000000();
    expect(typeof instance.up).toBe('function');
    expect(typeof instance.down).toBe('function');
  });

  it('up() SQL does NOT execute against authorization_policy table (no auth writes — FR-015)', () => {
    // Extract SQL strings (content inside template literals in up() and down())
    // and verify none write to the authorization_policy table.
    const sqlBlocks = migrationSrc.match(/await queryRunner\.query\(`([\s\S]*?)`\)/g) ?? [];
    const combinedSql = sqlBlocks.join('\n');
    // Should not update or insert into the authorization_policy table.
    expect(combinedSql).not.toMatch(/UPDATE\s+authorization_policy/i);
    expect(combinedSql).not.toMatch(/INSERT\s+INTO\s+authorization_policy/i);
  });

  it('up() SQL does NOT call authorizationPolicyResetAll (no auth reset — FR-015)', () => {
    const sqlBlocks = migrationSrc.match(/await queryRunner\.query\(`([\s\S]*?)`\)/g) ?? [];
    const combinedSql = sqlBlocks.join('\n');
    expect(combinedSql).not.toMatch(/authorizationPolicyResetAll/i);
  });

  it('up() SQL is scoped to collection kinds only: contributors and spaces (dissent ruling)', () => {
    // The WHERE clause must restrict to the two collection types.
    expect(migrationSrc).toMatch(/IN\s*\(\s*['"]contributors['"]\s*,\s*['"]spaces['"]\s*\)/i);
  });

  it('up() SQL is add-only: uses jsonb_set with IS NULL guard (idempotent, never overwrites)', () => {
    // Must use jsonb_set (additive) and IS NULL guard (idempotent).
    expect(migrationSrc).toMatch(/jsonb_set/);
    expect(migrationSrc).toMatch(/IS NULL/i);
  });

  it('up() SQL uses the correct callout_framing join for scoping', () => {
    // Must join to callout_framing to scope by type.
    expect(migrationSrc).toMatch(/callout_framing/);
    expect(migrationSrc).toMatch(/framingId/);
  });

  it('up() SQL does NOT reference INSERT or CREATE (no row creation — FR-015)', () => {
    const upSection = migrationSrc.slice(
      migrationSrc.indexOf('public async up'),
      migrationSrc.indexOf('public async down')
    );
    // Should only be UPDATE (jsonb_set = update existing JSON), no new row creation.
    expect(upSection).not.toMatch(/\bINSERT\b/i);
    expect(upSection).not.toMatch(/\bCREATE\b/i);
  });

  it('down() SQL strips the selection key without creating new rows', () => {
    const downSection = migrationSrc.slice(
      migrationSrc.indexOf('public async down')
    );
    expect(downSection).toMatch(/jsonb_set|#-/); // strip operator or jsonb_set
    expect(downSection).not.toMatch(/\bINSERT\b/i);
    expect(downSection).not.toMatch(/\bCREATE\b/i);
  });

  it('migration class name includes the timestamp 1784000000000', () => {
    expect(migrationSrc).toMatch(/AddCalloutSelectionSettings1784000000000/);
  });
});
