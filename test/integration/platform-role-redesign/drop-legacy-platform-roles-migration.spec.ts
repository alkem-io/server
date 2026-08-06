/**
 * Integration tests: DropLegacyPlatformRoles migration
 * (workspace#027-platform-role-redesign, T082, Slice B)
 *
 * SCOPE AND LIMITS — read before adding assertions here.
 *
 * These tests use a mock QueryRunner and assert on the SQL *text* and the
 * bound parameters. That is enough to pin the structural properties that are
 * cheap to break and expensive to lose:
 *   - STATEMENT ORDER: credentials before roles. Reversed, the migration
 *     leaves grants naming roles that no longer exist — the silent-void shape
 *     (research C1) this whole feature exists to eliminate.
 *   - the role delete is SCOPED to the platform role-set, so a space or
 *     organization role reusing one of these names is out of range.
 *   - BOTH spellings of the two C1 defect rows are deleted (the void string
 *     the seed actually stored, and the enum's real value).
 *   - `registered` is in NEITHER list: it is the baseline non-admin role and
 *     survives the redesign.
 *   - `down()` issues no statements at all — it must not present as a
 *     rollback when the grants are unrecoverable.
 *
 * It is NOT enough to prove the migration does the right thing to real rows.
 * Data-level behaviour is proven against a seeded PostgreSQL by
 * `pnpm run migration:validate` (T085) and by the pre-deploy T071a holder
 * export, which is what makes this deletion auditable at all — FR-018's
 * carve-out means the audit trail will not contain the dropped assignments.
 */

import { DropLegacyPlatformRoles1785000000005 } from '@src/migrations/1785000000005-DropLegacyPlatformRoles';

const createMockQueryRunner = () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  return {
    calls,
    runner: {
      query: (sql: string, params?: unknown[]) => {
        calls.push({ sql, params });
        return Promise.resolve([]);
      },
    } as any,
  };
};

describe('DropLegacyPlatformRoles migration (T082)', () => {
  const run = async () => {
    const { calls, runner } = createMockQueryRunner();
    await new DropLegacyPlatformRoles1785000000005().up(runner);
    return calls;
  };

  it('deletes credentials BEFORE roles — the only order that fails safe mid-way', async () => {
    const calls = await run();

    expect(calls).toHaveLength(2);
    expect(calls[0].sql).toContain('DELETE FROM credential');
    expect(calls[1].sql).toContain('DELETE FROM role');
  });

  it('scopes the role delete to the platform role-set', async () => {
    const calls = await run();

    expect(calls[1].sql).toContain(
      `SELECT id FROM role_set WHERE type = 'platform'`
    );
  });

  it('deletes both spellings of the two C1 defect credential types', async () => {
    const calls = await run();
    const types = calls[0].params?.[0] as string[];

    // As stored by the seed (matching no AuthorizationCredential member)...
    expect(types).toContain('global-spaces-reader');
    expect(types).toContain('global-community-reader');
    // ...and as the enum actually spells them.
    expect(types).toContain('global-spaces-read');
    expect(types).toContain('global-community-read');
  });

  it('retires exactly ten role names and spares `registered`', async () => {
    const calls = await run();
    const roleNames = calls[1].params?.[0] as string[];
    const credentialTypes = calls[0].params?.[0] as string[];

    expect(roleNames).toHaveLength(10);
    expect(roleNames).not.toContain('registered');
    expect(credentialTypes).not.toContain('global-registered');
  });

  it('leaves every surviving platform-*/feature-* role alone', async () => {
    const calls = await run();
    const roleNames = calls[1].params?.[0] as string[];
    const credentialTypes = calls[0].params?.[0] as string[];

    // The thirteen target roles. `platform-beta-tester`,
    // `platform-vc-campaign` and `platform-assistant-access` ARE retired —
    // they are legacy rows whose names happen to carry the `platform-` prefix,
    // which is exactly why this assertion lists the survivors explicitly
    // rather than pattern-matching on the prefix.
    for (const survivor of [
      'platform-roles-admin',
      'platform-users-admin',
      'platform-support',
      'platform-settings-admin',
      'platform-operations-admin',
      'platform-resource-admin',
      'platform-license-manager',
      'platform-content-full-access',
      'platform-spaces-reader',
      'platform-audit-reader',
      'feature-beta-tester',
      'feature-virtual-assistant',
      'feature-organization-creator',
    ]) {
      expect(roleNames).not.toContain(survivor);
      expect(credentialTypes).not.toContain(survivor);
    }
  });

  it('down() issues no statements — it must not look like a rollback', async () => {
    const { calls, runner } = createMockQueryRunner();
    await new DropLegacyPlatformRoles1785000000005().down(runner);

    expect(calls).toEqual([]);
  });
});
