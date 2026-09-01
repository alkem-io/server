import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Aligns every InnovationFlow's state-count bounds to the shared 1..8
 * allowance (client-web#9528).
 *
 * L0 spaces previously carried `minimumNumberOfStates: 4` (the "fixed phases"
 * floor from story #6177). That floor is removed: L0 spaces and subspaces now
 * share min 1 / max 8, which also unblocks promoting a subspace with fewer
 * than 4 states to L0 while keeping its flow states verbatim, and applying a
 * subspace-shaped template (or any template with 1..8 states) to an L0 space.
 *
 * Scope: ALL `innovation_flow` rows — space-owned flows (any level) and
 * template-content-space flows alike — so applying/creating from any template
 * is governed by the same bounds. The per-flow settings enforcement machinery
 * is unchanged; only the stored values move.
 *
 * Idempotent: the WHERE clause skips rows already at min 1 / max 8, so
 * re-running is a no-op.
 *
 * Legacy data: a handful of template-content flows carry a JSON `null` scalar
 * in `settings` (jsonb_set cannot set a path in a scalar), so any non-object
 * value is coerced to `{}` before the bounds are written — normalizing those
 * rows to a valid settings object as a side benefit.
 *
 * Rollback note: `down()` restores `minimumNumberOfStates: 4` on flows owned
 * by L0 (root) spaces only — the historical floor — and leaves the maximum at
 * 8 (its pre-migration value for space flows since
 * 1781900000000-BackfillL0InnovationFlowMaxStates). It restores the *bound*
 * only: an L0 flow that dropped below 4 states while the floor was lifted
 * (e.g. a promoted subspace) keeps its states; the delete-guard simply blocks
 * further deletions and the flow sits below its minimum until states are added.
 *
 * `innovation_flow.settings` is a `jsonb` column (converted from `json` by
 * migration 1767883714610-convertJsonToJsonb), so `jsonb_set` is used directly.
 */
export class InnovationFlowStateBounds1To81787788800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE innovation_flow
      SET settings = jsonb_set(
        jsonb_set(
          CASE WHEN jsonb_typeof(settings) = 'object' THEN settings ELSE '{}'::jsonb END,
          '{minimumNumberOfStates}', '1'::jsonb, true
        ),
        '{maximumNumberOfStates}', '8'::jsonb, true
      )
      WHERE jsonb_typeof(settings) IS DISTINCT FROM 'object'
         OR (settings ->> 'minimumNumberOfStates') IS DISTINCT FROM '1'
         OR (settings ->> 'maximumNumberOfStates') IS DISTINCT FROM '8'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE innovation_flow AS f
      SET settings = jsonb_set(f.settings, '{minimumNumberOfStates}', '4'::jsonb, true)
      FROM collaboration AS c
      JOIN space AS s ON s."collaborationId" = c.id
      WHERE c."innovationFlowId" = f.id
        AND s.level = 0
        AND (f.settings ->> 'minimumNumberOfStates') = '1'
    `);
  }
}
