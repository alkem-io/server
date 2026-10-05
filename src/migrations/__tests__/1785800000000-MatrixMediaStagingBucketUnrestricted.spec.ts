import { describe, expect, it, vi } from 'vitest';
import { MatrixMediaStagingBucketUnrestricted1785800000000 } from '../1785800000000-MatrixMediaStagingBucketUnrestricted';

/**
 * 013-matrix-media-file-service.
 *
 * Mocked-QueryRunner assertions (mirrors
 * 1785336300000-AddConversationMessageNotificationSettings.spec.ts). The
 * real-DB proof — up() clears the seeded policy, down() restores the exact
 * 1782300000001 snapshot, and the pair round-trips — was run against the live
 * local Postgres via `pnpm run migration:run` / `migration:revert`.
 *
 * What matters here is the SHAPE: the staging bucket must end up carrying NO
 * Alkemio policy (empty MIME allow-list, zero size cap — the platform's
 * "unrestricted" convention, see
 * MessageAttachmentService.checkAgainstBucketPolicy), and the write must be
 * scoped to the reserved bucket id and to nothing else.
 */
const RESERVED_BUCKET_ID = '00000000-0000-4000-8000-000000000013';

describe('MatrixMediaStagingBucketUnrestricted migration (1785800000000)', () => {
  const runMigration = async (direction: 'up' | 'down') => {
    const query = vi.fn().mockResolvedValue([]);
    const queryRunner = { query } as any;
    await new MatrixMediaStagingBucketUnrestricted1785800000000()[direction](
      queryRunner
    );
    return query;
  };

  it('up() makes the staging bucket unrestricted: empty allow-list AND zero size cap', async () => {
    const query = await runMigration('up');

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/"allowedMimeTypes"\s*=\s*''/);
    expect(sql).toMatch(/"maxFileSize"\s*=\s*0/);
    expect(params).toEqual([RESERVED_BUCKET_ID]);
  });

  it('up() touches ONLY the reserved staging bucket — never any other bucket', async () => {
    const query = await runMigration('up');

    const [sql] = query.mock.calls[0];
    expect(sql).toMatch(/UPDATE storage_bucket/);
    expect(sql).toMatch(/WHERE id = \$1/);
    // No schema DDL, no inserts, no deletes: a data-only correction.
    expect(sql).not.toMatch(/\bALTER\b|\bDROP\b|\bINSERT\b|\bDELETE\b/i);
  });

  it('down() restores the exact 1782300000001 seed (50 MiB + the curated allow-list)', async () => {
    const query = await runMigration('down');

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/"maxFileSize"\s*=\s*52428800/);
    expect(params[0]).toBe(RESERVED_BUCKET_ID);
    const restoredMimes = (params[1] as string).split(',');
    // Spot-check both ends of the curated set, and the deliberate SVG exclusion.
    expect(restoredMimes).toContain('image/png');
    expect(restoredMimes).toContain('application/pdf');
    expect(restoredMimes).not.toContain('image/svg+xml');
    expect(restoredMimes.length).toBeGreaterThan(30);
  });
});
