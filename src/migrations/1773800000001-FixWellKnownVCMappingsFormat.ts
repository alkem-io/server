import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Converts the platform.wellKnownVirtualContributors column from legacy formats to
 * the canonical array format expected by the new service code.
 *
 * History of the bug:
 *  1. The seed migration stored { "mappings": [] } (the IPlatformWellKnownVirtualContributors shape).
 *  2. The old setMapping() service cast the stored JSON to a flat Record and mutated it
 *     in-place, producing a hybrid object: { "mappings": [], "CHAT_GUIDANCE": "uuid", ... }.
 *  3. The new service code reads stored.mappings (the array), which is empty in the hybrid
 *     format, so getVirtualContributorID() still returns undefined — breaking guidance
 *     conversation creation completely.
 *
 * This migration converts:
 *   flat:   { "CHAT_GUIDANCE": "uuid" }
 *   hybrid: { "mappings": [], "CHAT_GUIDANCE": "uuid" }
 * to the canonical format:
 *   { "mappings": [{ "wellKnown": "CHAT_GUIDANCE", "virtualContributorID": "uuid" }] }
 *
 * Rows already in canonical format (no UUID-valued top-level keys other than "mappings")
 * are not touched.
 */
export class FixWellKnownVCMappingsFormat1773800000001
  implements MigrationInterface
{
  name = 'FixWellKnownVCMappingsFormat1773800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Only update rows that have at least one top-level key (other than "mappings")
    // whose value looks like a UUID — i.e., rows still in the old flat/hybrid format.
    const result = await queryRunner.query(`
      UPDATE platform
      SET "wellKnownVirtualContributors" = jsonb_build_object(
        'mappings',
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object('wellKnown', k, 'virtualContributorID', v)
            )
            FROM (
              SELECT key AS k, value AS v
              FROM jsonb_each_text("wellKnownVirtualContributors")
              WHERE key != 'mappings'
                AND value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            ) t
          ),
          '[]'::jsonb
        )
      )
      WHERE EXISTS (
        SELECT 1
        FROM jsonb_each_text("wellKnownVirtualContributors")
        WHERE key != 'mappings'
          AND value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      )
    `);

    console.log(
      `[Migration] FixWellKnownVCMappingsFormat: converted ${result[1] ?? 0} platform rows to canonical array format`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort revert: convert canonical array format back to flat { key: uuid } format.
    // Note: the original hybrid { "mappings": [], ... } state is not fully restorable.
    // Rows whose 'mappings' array is empty are left as-is (no entries to convert back).
    await queryRunner.query(`
      UPDATE platform
      SET "wellKnownVirtualContributors" = COALESCE(
        (
          SELECT jsonb_object_agg(m->>'wellKnown', m->>'virtualContributorID')
          FROM jsonb_array_elements("wellKnownVirtualContributors"->'mappings') AS m
        ),
        '{}'::jsonb
      )
      WHERE jsonb_typeof("wellKnownVirtualContributors"->'mappings') = 'array'
    `);

    console.log('[Migration] FixWellKnownVCMappingsFormat: reverted to flat format');
  }
}
