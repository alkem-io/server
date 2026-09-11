import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VisualType } from '@common/enums/visual.type';
import { DEFAULT_VISUAL_CONSTRAINTS } from '@domain/common/visual/visual.constraints';
import { SetBannerDefaultAspectRatio1788300000000 } from '../1788300000000-SetBannerDefaultAspectRatio';

/**
 * Static-analysis assertions for the SetBannerDefaultAspectRatio migration.
 * These run without a database connection by inspecting the migration source,
 * and pin the migrated value to the constants so the two cannot drift apart.
 */
describe('SetBannerDefaultAspectRatio migration (1788300000000)', () => {
  const migrationSrc = readFileSync(
    resolve(__dirname, '../1788300000000-SetBannerDefaultAspectRatio.ts'),
    'utf8'
  );
  const banner = DEFAULT_VISUAL_CONSTRAINTS[VisualType.BANNER];
  const sqlBlocks =
    migrationSrc.match(/await queryRunner\.query\(\s*`([\s\S]*?)`\s*\)/g) ?? [];
  const upSrc = migrationSrc.slice(
    migrationSrc.indexOf('async up('),
    migrationSrc.indexOf('async down(')
  );

  it('exports the expected class', () => {
    const instance = new SetBannerDefaultAspectRatio1788300000000();
    expect(typeof instance.up).toBe('function');
    expect(typeof instance.down).toBe('function');
  });

  it('up() writes the same default as DEFAULT_VISUAL_CONSTRAINTS[BANNER]', () => {
    expect(upSrc).toMatch(
      new RegExp(`"aspectRatio"\\s*=\\s*${banner.aspectRatio}\\b`)
    );
  });

  it('the default sits within the adjustable [minAspectRatio, maxAspectRatio] range', () => {
    expect(banner.aspectRatio).toBeGreaterThanOrEqual(banner.minAspectRatio);
    expect(banner.aspectRatio).toBeLessThanOrEqual(banner.maxAspectRatio);
  });

  it('only touches image-less banner rows and never rewrites the size bounds or uri', () => {
    expect(sqlBlocks.length).toBe(2);
    for (const block of sqlBlocks) {
      expect(block).toMatch(/WHERE\s+"name"\s*=\s*'banner'/);
      // Rows WITH an image are user data and must never be rewritten.
      expect(block).toMatch(/\(\s*"uri"\s+IS\s+NULL\s+OR\s+"uri"\s*=\s*''\s*\)/);
      // The SET clause only ever writes aspectRatio: the size bounds and the
      // uri are never rewritten (uri appears in the WHERE predicate only).
      const setClause = block.slice(
        block.indexOf('SET'),
        block.indexOf('WHERE')
      );
      expect(setClause).toMatch(/^SET\s+"aspectRatio"\s*=\s*\d+\s*$/);
      for (const column of [
        'minWidth',
        'maxWidth',
        'minHeight',
        'maxHeight',
        'uri',
      ]) {
        expect(setClause).not.toMatch(new RegExp(`"${column}"`));
      }
      expect(block).not.toMatch(/bannerWide/i);
    }
  });

  it('up() and down() are exact inverses over the same predicate', () => {
    const [upBlock, downBlock] = sqlBlocks;
    expect(upBlock).toMatch(/"aspectRatio"\s*=\s*10\s+WHERE/);
    expect(upBlock).toMatch(/AND\s+"aspectRatio"\s*=\s*6\b/);
    expect(downBlock).toMatch(/"aspectRatio"\s*=\s*6\s+WHERE/);
    expect(downBlock).toMatch(/AND\s+"aspectRatio"\s*=\s*10\b/);
  });
});
