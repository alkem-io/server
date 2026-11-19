import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { ResyncFlowStateTagsetTemplates1789000000000 } from '../1789000000000-ResyncFlowStateTagsetTemplates';

/**
 * Static-analysis plus mocked-QueryRunner assertions for the flow-state
 * vocabulary repair migration — no database connection needed, mirroring the
 * other migration specs in this directory.
 *
 * The migration must be a pure data repair: exactly three guarded UPDATE
 * statements, issued in dependency order (allowed values, then the default,
 * then the stranded callout tags that read the repaired default), with no
 * DDL and no row creation or deletion. `down()` is a documented no-op.
 * The real-database before/after evidence (drift converges, re-run touches
 * zero rows) is gathered against the dev stack and recorded in the PR body.
 */
describe('ResyncFlowStateTagsetTemplates migration', () => {
  const migrationSrc = readFileSync(
    resolve(__dirname, '../1789000000000-ResyncFlowStateTagsetTemplates.ts'),
    'utf8'
  );
  const upSection = migrationSrc.slice(
    migrationSrc.indexOf('public async up'),
    migrationSrc.indexOf('public async down')
  );

  const runUp = async () => {
    const queryRunner = { query: vi.fn().mockResolvedValue(undefined) };
    const migration = new ResyncFlowStateTagsetTemplates1789000000000();
    await migration.up(queryRunner as any);
    return queryRunner.query.mock.calls.map(call => call[0] as string);
  };

  it('exports the expected class with up()/down()', () => {
    expect(ResyncFlowStateTagsetTemplates1789000000000).toBeDefined();
    const instance = new ResyncFlowStateTagsetTemplates1789000000000();
    expect(typeof instance.up).toBe('function');
    expect(typeof instance.down).toBe('function');
  });

  it('up() issues exactly three UPDATE statements: allowedValues, then defaultSelectedValue, then tags', async () => {
    const statements = await runUp();

    expect(statements).toHaveLength(3);
    for (const sql of statements) {
      expect(sql).toMatch(/WITH flow_states AS/);
      expect(sql).toMatch(/\bUPDATE\b/);
    }
    expect(statements[0]).toMatch(/UPDATE tagset_template tt/);
    expect(statements[0]).toMatch(/SET "allowedValues"/);
    expect(statements[1]).toMatch(/UPDATE tagset_template tt/);
    expect(statements[1]).toMatch(/SET "defaultSelectedValue"/);
    expect(statements[2]).toMatch(/UPDATE tagset t\b/);
    expect(statements[2]).toMatch(/SET tags =/);
  });

  it('allowedValues statement aggregates state names ordered by sortOrder and is guarded by IS DISTINCT FROM', async () => {
    const [allowedValuesSql] = await runUp();

    expect(allowedValuesSql).toMatch(
      /string_agg\(s\."displayName", ',' ORDER BY s\."sortOrder"\)/
    );
    expect(allowedValuesSql).toMatch(/"allowedValues" IS DISTINCT FROM/);
  });

  it('defaultSelectedValue statement is guarded by IS NULL OR not-in-state-names (<> ALL)', async () => {
    const [, defaultSql] = await runUp();

    expect(defaultSql).toMatch(/COALESCE\(fs\.current_name, fs\.first_name\)/);
    expect(defaultSql).toMatch(/"defaultSelectedValue" IS NULL\s+OR/);
    expect(defaultSql).toMatch(/"defaultSelectedValue" <> ALL\(/);
  });

  it('tagset statement targets flow-state tagsets only and compares case-insensitively on both sides', async () => {
    const [, , tagsSql] = await runUp();

    expect(tagsSql).toMatch(/t\.name = 'flow-state'/);
    expect(tagsSql).toMatch(/t\."tagsetTemplateId" = tt\.id/);
    expect(tagsSql).toMatch(/lower\(t\.tags\) <> ALL\(SELECT lower\(unnest\(/);
    expect(tagsSql).toMatch(/SET tags = tt\."defaultSelectedValue"/);
  });

  it('up() is a pure data repair: no DDL, no INSERT, no DELETE', () => {
    expect(upSection).not.toMatch(/\bCREATE\b/i);
    expect(upSection).not.toMatch(/\bALTER\b/i);
    expect(upSection).not.toMatch(/\bDROP\b/i);
    expect(upSection).not.toMatch(/\bINSERT\b/i);
    expect(upSection).not.toMatch(/\bDELETE\b/i);
  });

  it('down() issues no query (intentionally irreversible)', async () => {
    const queryRunner = { query: vi.fn().mockResolvedValue(undefined) };
    const migration = new ResyncFlowStateTagsetTemplates1789000000000();

    await migration.down(queryRunner as any);

    expect(queryRunner.query).not.toHaveBeenCalled();
  });
});
