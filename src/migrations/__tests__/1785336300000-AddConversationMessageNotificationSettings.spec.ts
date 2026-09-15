import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { AddConversationMessageNotificationSettings1785336300000 } from '../1785336300000-AddConversationMessageNotificationSettings';

/**
 * 034-messaging-notifications (T008, contract C-5, FR-002/FR-004).
 *
 * Static-analysis + mocked-QueryRunner assertions — no DB connection needed
 * (mirrors 1784000000000-AddCalloutSelectionSettings.spec.ts). The real-DB
 * before/after behavioral proof (pre-migration row -> non-null defaults,
 * pre-existing keys never clobbered, idempotent re-run, reversible down())
 * runs out of band against a scratch database via
 * `.scripts/migrations/verify_034_conversation_message_settings.sh` — see
 * that script's output for the evidence. `pnpm run migration:validate`
 * additionally requires operator-supplied `.env` + `db/reference_schema.sql`
 * side-car fixtures (see `.scripts/migrations/README.md`) not present in every
 * environment, hence the dedicated verify script (same rationale as
 * `verify_021_backfill.sh`).
 */
describe('AddConversationMessageNotificationSettings migration (1785336300000)', () => {
  const migrationSrc = readFileSync(
    resolve(
      __dirname,
      '../1785336300000-AddConversationMessageNotificationSettings.ts'
    ),
    'utf8'
  );

  it('exports the expected class with up()/down()', () => {
    expect(
      AddConversationMessageNotificationSettings1785336300000
    ).toBeDefined();
    const instance =
      new AddConversationMessageNotificationSettings1785336300000();
    expect(typeof instance.up).toBe('function');
    expect(typeof instance.down).toBe('function');
  });

  it('up() SQL is additive-only: jsonb_set guarded by IS NULL (never overwrites an existing row)', () => {
    const upSection = migrationSrc.slice(
      migrationSrc.indexOf('public async up'),
      migrationSrc.indexOf('public async down')
    );
    expect(upSection).toMatch(/jsonb_set/);
    expect(upSection).toMatch(/IS NULL/);
    expect(upSection).not.toMatch(/\bINSERT\b/i);
    expect(upSection).not.toMatch(/\bCREATE\b/i);
  });

  it('down() strips exactly the two new keys via the `#-` operator, creates no rows', () => {
    const downSection = migrationSrc.slice(
      migrationSrc.indexOf('public async down')
    );
    expect(downSection).toMatch(/#-/);
    expect(downSection).not.toMatch(/\bINSERT\b/i);
    expect(downSection).not.toMatch(/\bCREATE\b/i);
  });

  it('touches both conversationMessageDirect and conversationMessageGroup keys', () => {
    expect(migrationSrc).toContain('conversationMessageDirect');
    expect(migrationSrc).toContain('conversationMessageGroup');
  });

  it('migration class name includes the timestamp 1785336300000', () => {
    expect(migrationSrc).toMatch(
      /AddConversationMessageNotificationSettings1785336300000/
    );
  });

  it('up() runs one guarded jsonb_set per key against user_settings, with mandated defaults', async () => {
    const queryRunner = { query: vi.fn().mockResolvedValue(undefined) };
    const migration =
      new AddConversationMessageNotificationSettings1785336300000();

    await migration.up(queryRunner as any);

    expect(queryRunner.query).toHaveBeenCalledTimes(2);
    for (const call of queryRunner.query.mock.calls) {
      const [sql, params] = call;
      expect(sql).toMatch(/UPDATE user_settings/);
      expect(sql).toMatch(/jsonb_set/);
      expect(sql).toMatch(/IS NULL/);
      expect(params[0]).toBe(
        JSON.stringify({ email: false, inApp: false, push: true })
      );
    }
    const sqlTexts = queryRunner.query.mock.calls.map(c => c[0] as string);
    expect(sqlTexts.some(s => s.includes('conversationMessageDirect'))).toBe(
      true
    );
    expect(sqlTexts.some(s => s.includes('conversationMessageGroup'))).toBe(
      true
    );
  });

  it('down() runs one guarded strip per key against user_settings', async () => {
    const queryRunner = { query: vi.fn().mockResolvedValue(undefined) };
    const migration =
      new AddConversationMessageNotificationSettings1785336300000();

    await migration.down(queryRunner as any);

    expect(queryRunner.query).toHaveBeenCalledTimes(2);
    for (const call of queryRunner.query.mock.calls) {
      const [sql] = call;
      expect(sql).toMatch(/UPDATE user_settings/);
      expect(sql).toMatch(/#-/);
    }
  });
});
