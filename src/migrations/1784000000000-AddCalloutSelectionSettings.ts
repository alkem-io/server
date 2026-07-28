import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add the `selection` key to the framing settings of every existing
 * collection callout and collection-callout template that lacks it
 * (workspace#025-callout-manual-selection, FR-015 / US5-AS1..AS4).
 *
 * Rules:
 * - ADD-ONLY, idempotent: the `IS NULL` guard means a pre-existing selection
 *   (e.g. a CUSTOM one already set via the API, or a previous migration run)
 *   is NEVER overwritten.
 * - Scope: callout rows whose callout_framing.type ∈ ('contributors','spaces')
 *   ONLY. This covers both live collection callouts and their template callouts
 *   (template callouts are callout rows — same table, same framing-type filter).
 *   All other callout kinds (NONE/WHITEBOARD/LINK/MEMO/MEDIA_GALLERY/POLL/
 *   COLLABORA_DOCUMENT) are NOT touched.
 * - Zero row creation, zero authorization_policy writes, no authorizationPolicyResetAll.
 *
 * The read path already defaults an absent selection to AUTO with an empty list
 * (FR-016) so the migration is a backfill convenience, not a correctness gate.
 *
 * down() strips the `selection` key from the same scoped set of rows so a
 * revert is safe. CUSTOM selections lose their stored list on rollback, which
 * is the safe direction (they degrade to AUTO).
 */
export class AddCalloutSelectionSettings1784000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // jsonb_set with `create_missing = true` upserts the nested path.
    // The `co.settings ? 'framing'` guard ensures we only touch rows that
    // already have a framing JSONB block (belt-and-suspenders; all collection
    // callouts created via the API have it).
    await queryRunner.query(`
      UPDATE callout co
      SET settings = jsonb_set(
        co.settings,
        '{framing,selection}',
        '{"mode":"auto","selectedIds":[]}'::jsonb,
        true
      )
      FROM callout_framing cf
      WHERE cf.id = co."framingId"
        AND cf.type IN ('contributors', 'spaces')
        AND co.settings ? 'framing'
        AND co.settings -> 'framing' -> 'selection' IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE callout co
      SET settings = jsonb_set(
        co.settings,
        '{framing}',
        (co.settings -> 'framing') #- '{selection}',
        false
      )
      FROM callout_framing cf
      WHERE cf.id = co."framingId"
        AND cf.type IN ('contributors', 'spaces')
        AND co.settings -> 'framing' -> 'selection' IS NOT NULL
    `);
  }
}
