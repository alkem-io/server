import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { organizationApplicationForm } from '@domain/community/organization/definitions/organization.role.application.form';
import { OrganizationApplicationFormMessageOptional1789000000000 } from '../1789000000000-OrganizationApplicationFormMessageOptional';

/**
 * Static-analysis assertions for the OrganizationApplicationFormMessageOptional
 * migration. Runs without a database connection by inspecting the migration
 * source, and pins the migrated question text to the seed definition so the
 * two cannot drift apart.
 */
describe('OrganizationApplicationFormMessageOptional migration (1789000000000)', () => {
  const migrationSrc = readFileSync(
    resolve(
      __dirname,
      '../1789000000000-OrganizationApplicationFormMessageOptional.ts'
    ),
    'utf8'
  );
  const seedQuestion = organizationApplicationForm.questions[0].question;
  const upSrc = migrationSrc.slice(
    migrationSrc.indexOf('async up('),
    migrationSrc.indexOf('async down(')
  );

  it('exports the expected class', () => {
    const instance =
      new OrganizationApplicationFormMessageOptional1789000000000();
    expect(typeof instance.up).toBe('function');
    expect(typeof instance.down).toBe('function');
  });

  it('the seed question is already required:false, so the migration and the seed agree', () => {
    expect(organizationApplicationForm.questions[0].required).toBe(false);
  });

  it("up() only rewrites forms whose role_set is of type 'organization'", () => {
    expect(upSrc).toMatch(/role_set\.type\s*=\s*'organization'/);
  });

  it('up() matches the exact seed question text', () => {
    expect(upSrc).toContain(seedQuestion);
  });

  it('up() flips required true -> false and never touches other question fields', () => {
    expect(upSrc).toMatch(/jsonb_set\(elem,\s*'\{required\}',\s*'false'::jsonb\)/);
    expect(upSrc).not.toMatch(/maxLength/);
    expect(upSrc).not.toMatch(/explanation/);
  });

  it('up() is idempotent: guarded by jsonb containment on required:true', () => {
    expect(upSrc).toMatch(/@>\s*'\[\{"question":"[^"]+","required":true\}\]'::jsonb/);
  });

  it('down() is an intentional no-op', () => {
    const downSrc = migrationSrc.slice(migrationSrc.indexOf('async down('));
    expect(downSrc).toMatch(/Intentional no-op/);
  });
});
