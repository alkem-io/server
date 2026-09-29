import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { AddCalloutForm1789100000000 } from '../1789100000000-AddCalloutForm';

/**
 * Static-analysis + mocked-QueryRunner assertions — no DB connection needed
 * (same approach as 1785336300000-AddConversationMessageNotificationSettings.spec.ts).
 * The real-database proof (tables and FKs, the cascade, the idempotent
 * backfill) runs out of band against a scratch database.
 */
describe('AddCalloutForm migration (1789100000000)', () => {
  const migrationSrc = readFileSync(
    resolve(__dirname, '../1789100000000-AddCalloutForm.ts'),
    'utf8'
  );
  const statements = async () => {
    const queryRunner = { query: vi.fn().mockResolvedValue(undefined) };
    await new AddCalloutForm1789100000000().up(queryRunner as any);
    return queryRunner.query.mock.calls as [string, unknown[]?][];
  };

  it('is newer than the previous newest migration', () => {
    expect(1789100000000).toBeGreaterThan(1789000000000);
    expect(migrationSrc).toMatch(/AddCalloutForm1789100000000/);
  });

  it('creates both tables and never alters an existing one', async () => {
    const sql = (await statements()).map(([q]) => q).join('\n');
    expect(sql).toMatch(/CREATE TABLE "callout_form" \(/);
    expect(sql).toMatch(/CREATE TABLE "callout_form_response" \(/);
    expect(sql).not.toMatch(/ALTER TABLE "callout_framing"/);
    expect(sql).not.toMatch(/ALTER TABLE "(?!callout_form)/);
  });

  it('cascades the form from the framing, the responses from the form, and nulls the submitter', async () => {
    const sql = (await statements()).map(([q]) => q).join('\n');
    expect(sql).toMatch(
      /"callout_form" ADD CONSTRAINT[^\n]+FOREIGN KEY \("framingId"\) REFERENCES "callout_framing"\("id"\) ON DELETE CASCADE/
    );
    expect(sql).toMatch(
      /"callout_form_response" ADD CONSTRAINT[^\n]+FOREIGN KEY \("formId"\) REFERENCES "callout_form"\("id"\) ON DELETE CASCADE/
    );
    expect(sql).toMatch(
      /"callout_form_response" ADD CONSTRAINT[^\n]+FOREIGN KEY \("createdBy"\) REFERENCES "user"\("id"\) ON DELETE SET NULL/
    );
    expect(sql).toMatch(/"framingId" uuid NOT NULL/);
    expect(sql).toMatch(/UNIQUE \("framingId"\)/);
  });

  it('creates the two response indexes', async () => {
    const sql = (await statements()).map(([q]) => q).join('\n');
    expect(sql).toMatch(
      /CREATE INDEX "IDX_callout_form_response_form_row" ON "callout_form_response" \("formId", "rowId"\)/
    );
    expect(sql).toMatch(
      /CREATE INDEX "IDX_callout_form_response_form_created_by" ON "callout_form_response" \("formId", "createdBy"\)/
    );
  });

  it('backfills the settings key additively, guarded by IS NULL, with all channels on', async () => {
    const calls = await statements();
    const backfill = calls.find(([q]) => q.includes('UPDATE user_settings'));
    expect(backfill).toBeDefined();
    const [sql, params] = backfill!;
    expect(sql).toMatch(/jsonb_set/);
    expect(sql).toMatch(
      /WHERE notification #> '\{space,admin,collaborationCalloutFormResponseReceived\}' IS NULL/
    );
    expect(JSON.parse(params![0] as string)).toEqual({
      email: true,
      inApp: true,
      push: true,
    });
  });

  it('runs the DDL before the backfill', async () => {
    const calls = await statements();
    const backfillIndex = calls.findIndex(([q]) =>
      q.includes('UPDATE user_settings')
    );
    const lastDdlIndex = calls.reduce(
      (last, [q], index) => (/CREATE|ALTER/.test(q) ? index : last),
      -1
    );
    expect(lastDdlIndex).toBeLessThan(backfillIndex);
  });

  it('down() drops both tables, response first, and leaves the settings key', async () => {
    const queryRunner = { query: vi.fn().mockResolvedValue(undefined) };
    await new AddCalloutForm1789100000000().down(queryRunner as any);
    const sql = queryRunner.query.mock.calls.map(([q]) => q);
    expect(sql).toEqual([
      'DROP TABLE "callout_form_response"',
      'DROP TABLE "callout_form"',
    ]);
  });
});
