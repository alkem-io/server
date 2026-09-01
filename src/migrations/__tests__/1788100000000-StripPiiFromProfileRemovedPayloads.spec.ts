import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { StripPiiFromProfileRemovedPayloads1788100000000 } from '../1788100000000-StripPiiFromProfileRemovedPayloads';

/**
 * Static-analysis assertions for the PII-strip backfill migration. These run
 * without a database connection by inspecting the migration source
 * directly.
 */
describe('StripPiiFromProfileRemovedPayloads migration (1788100000000)', () => {
  const migrationSrc = readFileSync(
    resolve(__dirname, '../1788100000000-StripPiiFromProfileRemovedPayloads.ts'),
    'utf8'
  );

  it('exports the expected class', () => {
    expect(StripPiiFromProfileRemovedPayloads1788100000000).toBeDefined();
    const instance = new StripPiiFromProfileRemovedPayloads1788100000000();
    expect(typeof instance.up).toBe('function');
    expect(typeof instance.down).toBe('function');
  });

  it('is idempotent: guards the UPDATE with a WHERE clause matching only rows that still carry a key', () => {
    const sqlBlocks =
      migrationSrc.match(/await queryRunner\.query\(`([\s\S]*?)`\)/g) ?? [];
    const updateBlock = sqlBlocks.find(block => /UPDATE\s+in_app_notification/i.test(block));
    expect(updateBlock).toBeDefined();
    expect(updateBlock).toMatch(/payload \? 'userDisplayName' OR payload \? 'userEmail'/);
  });

  it('strips exactly the two PII keys, additively (jsonb `-` operator), never rewriting other keys', () => {
    expect(migrationSrc).toMatch(/payload - 'userDisplayName' - 'userEmail'/);
  });

  it('down() is a documented no-op — stripped PII is not recoverable', () => {
    const downBody = migrationSrc.split('public async down')[1];
    expect(downBody).toMatch(/no-op/i);
  });
});
