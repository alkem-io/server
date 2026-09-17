import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VisualType } from '@common/enums/visual.type';
import { DEFAULT_VISUAL_CONSTRAINTS } from '@domain/common/visual/visual.constraints';
import { LowerSpaceBannerMinWidth1787600000000 } from '../1787600000000-LowerSpaceBannerMinWidth';

/**
 * Static-analysis assertions for the LowerSpaceBannerMinWidth migration. These
 * run without a database connection by inspecting the migration source, and
 * pin the migrated values to the constants so the two cannot drift apart.
 */
describe('LowerSpaceBannerMinWidth migration (1787600000000)', () => {
  const migrationSrc = readFileSync(
    resolve(__dirname, '../1787600000000-LowerSpaceBannerMinWidth.ts'),
    'utf8'
  );
  const banner = DEFAULT_VISUAL_CONSTRAINTS[VisualType.BANNER];

  it('exports the expected class', () => {
    const instance = new LowerSpaceBannerMinWidth1787600000000();
    expect(typeof instance.up).toBe('function');
    expect(typeof instance.down).toBe('function');
  });

  it('up() writes the same floor as DEFAULT_VISUAL_CONSTRAINTS[BANNER]', () => {
    const upSrc = migrationSrc.slice(
      migrationSrc.indexOf('async up('),
      migrationSrc.indexOf('async down(')
    );
    expect(upSrc).toMatch(
      new RegExp(`"minWidth"\\s*=\\s*${banner.minWidth}\\b`)
    );
    expect(upSrc).toMatch(
      new RegExp(`"minHeight"\\s*=\\s*${banner.minHeight}\\b`)
    );
    // minHeight must span the whole adjustable 6-10 ratio range.
    expect(banner.minHeight).toBe(
      Math.ceil(banner.minWidth / banner.maxAspectRatio)
    );
  });

  it('only touches banner rows and never rewrites aspectRatio or uri', () => {
    const sqlBlocks =
      migrationSrc.match(/await queryRunner\.query\(\s*`([\s\S]*?)`\s*\)/g) ?? [];
    expect(sqlBlocks.length).toBe(2);
    for (const block of sqlBlocks) {
      expect(block).toMatch(/WHERE\s+"name"\s*=\s*'banner'/);
      expect(block).not.toMatch(/"aspectRatio"/);
      expect(block).not.toMatch(/"uri"/);
      expect(block).not.toMatch(/bannerWide/i);
    }
  });
});
