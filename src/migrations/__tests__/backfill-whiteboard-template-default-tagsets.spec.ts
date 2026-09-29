import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BackfillWhiteboardTemplateDefaultTagsets1790669200000 } from '../1790669200000-BackfillWhiteboardTemplateDefaultTagsets';

describe('BackfillWhiteboardTemplateDefaultTagsets migration', () => {
  const migrationSource = readFileSync(
    resolve(
      __dirname,
      '../1790669200000-BackfillWhiteboardTemplateDefaultTagsets.ts'
    ),
    'utf8'
  );
  const upSource = migrationSource.slice(
    migrationSource.indexOf('async up('),
    migrationSource.indexOf('async down(')
  );

  it('exports the expected migration shape', () => {
    const migration =
      new BackfillWhiteboardTemplateDefaultTagsets1790669200000();

    expect(typeof migration.up).toBe('function');
    expect(typeof migration.down).toBe('function');
  });

  it('selects only Whiteboard Template profiles that lack the default freeform tagset', () => {
    expect(upSource).toMatch(/FROM template t/);
    expect(upSource).toMatch(/JOIN whiteboard w ON w\.id = t\."whiteboardId"/);
    expect(upSource).toMatch(/JOIN profile p ON p\.id = w\."profileId"/);
    expect(upSource).toMatch(/t\.type = 'whiteboard'/);
    expect(upSource).toMatch(/NOT EXISTS \([\s\S]*existing\."profileId" = p\.id/);
    expect(upSource).toMatch(/LOWER\(existing\.name\) = 'default'/);
    expect(upSource).toMatch(/existing\.type = 'freeform'/);
    expect(upSource).toMatch(/SELECT DISTINCT ON \(p\.id\)/);
  });

  it('fails before a write for missing profile authorization or duplicate defaults', () => {
    const dataWriteIndex = upSource.indexOf('WITH template_profiles');
    const preflight = upSource.slice(0, dataWriteIndex);

    expect(dataWriteIndex).toBeGreaterThan(0);
    expect(preflight).toMatch(/missing_default_count NOT IN \(0, 117\)/);
    expect(preflight).toMatch(/profile_auth\.id IS NULL/);
    expect(preflight).toMatch(/HAVING COUNT\(\*\) > 1/);
    expect(preflight).toMatch(/RAISE EXCEPTION/);
  });

  it('creates one authorized empty default tagset by inheriting cascading profile rules', () => {
    expect(upSource).toMatch(/INSERT INTO authorization_policy/);
    expect(upSource).toMatch(/jsonb_array_elements\(profile_credential_rules\)/);
    expect(upSource).toMatch(/rule ->> 'cascade'/);
    expect(upSource).toMatch(/INSERT INTO tagset/);
    expect(upSource).toMatch(
      /JOIN inserted_authorizations[\s\S]*tagset_authorization_id/
    );
    expect(upSource).toMatch(/'default'/);
    expect(upSource).toMatch(/'freeform'/);
    expect(upSource).toMatch(/''/);
  });

  it('post-validates the repaired population and leaves down non-destructive', () => {
    const postValidation = upSource.slice(upSource.lastIndexOf('DO $$'));
    const downSource = migrationSource.slice(migrationSource.indexOf('async down('));

    expect(postValidation).toMatch(/NOT EXISTS/);
    expect(postValidation).toMatch(/HAVING COUNT\(\*\) > 1/);
    expect(postValidation).toMatch(/RAISE EXCEPTION/);
    expect(downSource).toMatch(/Intentional no-op/);
    expect(downSource).not.toMatch(/queryRunner\.query/);
  });
});
