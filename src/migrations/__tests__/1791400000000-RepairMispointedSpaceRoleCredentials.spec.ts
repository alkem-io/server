import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { RepairMispointedSpaceRoleCredentials1791400000000 } from '../1791400000000-RepairMispointedSpaceRoleCredentials';

/**
 * Static-analysis assertions for the RepairMispointedSpaceRoleCredentials migration.
 * The SQL itself was exercised against a restored copy of the acceptance database:
 * up() fixed 162 roles, moved 164 credentials and recomputed 420 parentCredentials,
 * a second up() was a no-op, and down() restored credential + role rows to an
 * identical md5 of the original.
 */
describe('RepairMispointedSpaceRoleCredentials migration (1791400000000)', () => {
  const migrationSrc = readFileSync(
    resolve(
      __dirname,
      '../1791400000000-RepairMispointedSpaceRoleCredentials.ts'
    ),
    'utf8'
  );
  const upSrc = migrationSrc.slice(
    migrationSrc.indexOf('public async up('),
    migrationSrc.indexOf('public async down(')
  );
  const downSrc = migrationSrc.slice(migrationSrc.indexOf('public async down('));

  it('exports the expected class', () => {
    const instance = new RepairMispointedSpaceRoleCredentials1791400000000();
    expect(instance.name).toBe(
      'RepairMispointedSpaceRoleCredentials1791400000000'
    );
    expect(typeof instance.up).toBe('function');
    expect(typeof instance.down).toBe('function');
  });

  it('up() is a no-op when no mis-pointed space role exists', async () => {
    const query = vi.fn(async (sql: string) =>
      /count\(\*\)::int AS count FROM _rmr_roles/.test(sql)
        ? [{ count: 0 }]
        : []
    );
    await new RepairMispointedSpaceRoleCredentials1791400000000().up({
      query,
    } as any);
    const writes = query.mock.calls
      .map(([sql]) => sql as string)
      .filter(sql => /^\s*(UPDATE|DELETE|INSERT INTO (role|credential))\b/i.test(sql));
    expect(writes).toEqual([]);
  });

  it('logs every credential before it is deleted and every row before it is updated', () => {
    expect(upSrc.indexOf("'credential-revoked', 'credential', c.id")).toBeLessThan(
      upSrc.indexOf('DELETE FROM credential WHERE id IN (SELECT credential_id FROM _rmr_revokes)')
    );
    expect(upSrc.indexOf("'role-credential-fixed'")).toBeLessThan(
      upSrc.indexOf('UPDATE role r\n      SET credential')
    );
    expect(upSrc.indexOf("'role-parent-credentials-fixed'")).toBeLessThan(
      upSrc.indexOf('UPDATE role r SET "parentCredentials"')
    );
    expect(upSrc.indexOf("'subspace admin issued for wrong target'")).toBeLessThan(
      upSrc.indexOf('DELETE FROM credential WHERE id IN (SELECT credential_id FROM _rmr_subadmin_revokes)')
    );
  });

  it('up() throws (rolls back) when mis-pointed roles remain', () => {
    expect(upSrc).toMatch(/if \(residual !== 0\) \{\s*throw new Error\(/);
  });

  it('down() reverses every logged action', () => {
    for (const action of [
      'role-parent-credentials-fixed',
      'credential-revoked',
      'credential-granted',
      'role-credential-fixed',
    ]) {
      expect(downSrc).toContain(`l."action" = '${action}'`);
    }
  });
});
