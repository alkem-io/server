import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills the loosened maximum number of InnovationFlow states (tabs) onto
 * existing L0 (root) spaces (story #6177, epic alkem-io/alkemio#1930).
 *
 * Previously L0 spaces were pinned to a small `maximumNumberOfStates` (the L0
 * bootstrap template has historically seeded `5`, and older data may carry `4`).
 * They now allow up to 8 (the subspace allowance) so admins can add tabs beyond
 * the fixed 4. `minimumNumberOfStates` is intentionally left untouched (stays 4)
 * so the 4 fixed phases remain an undeletable floor.
 *
 * Scope: only `innovation_flow` rows whose owning Space has `level = 0`. The
 * `space.level = 0` join naturally excludes subspaces (L1/L2) and template
 * content spaces (which are not rows in the `space` table).
 *
 * Idempotent: only updates rows whose current max is still one of the legacy
 * pinned defaults (`4` or `5`), so re-running is a no-op and any value already at
 * 8 is left alone. `maximumNumberOfStates` is not admin-settable from the client,
 * so the legacy defaults are the only values this can encounter.
 *
 * Rollback note: `down()` lowers the bound back to 5 (the historical L0 default)
 * for L0 flows currently at 8. It restores the *bound* only — if admins added
 * tabs (6..8) before a rollback, those extra states remain in the data; the
 * add-guard simply prevents further additions. Existing states stay valid.
 *
 * `innovation_flow.settings` is a `jsonb` column (converted from `json` by
 * migration 1767883714610-convertJsonToJsonb), so `jsonb_set` is used directly.
 */
export class BackfillL0InnovationFlowMaxStates1781900000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE innovation_flow AS f
      SET settings = jsonb_set(f.settings, '{maximumNumberOfStates}', '8'::jsonb, true)
      FROM collaboration AS c
      JOIN space AS s ON s."collaborationId" = c.id
      WHERE c."innovationFlowId" = f.id
        AND s.level = 0
        AND (f.settings ->> 'maximumNumberOfStates') IN ('4', '5')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE innovation_flow AS f
      SET settings = jsonb_set(f.settings, '{maximumNumberOfStates}', '5'::jsonb, true)
      FROM collaboration AS c
      JOIN space AS s ON s."collaborationId" = c.id
      WHERE c."innovationFlowId" = f.id
        AND s.level = 0
        AND (f.settings ->> 'maximumNumberOfStates') = '8'
    `);
  }
}
