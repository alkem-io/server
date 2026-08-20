import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills the per-tab `sidebar` widget list into the JSONB `settings` of every
 * `innovation_flow_state` row that lacks one, so every existing Space (and template)
 * renders its sidebar from configuration with zero visual change.
 *
 * Position within a flow (by `sortOrder`) is the only signal available for the L0
 * default mapping — it mirrors exactly how the client routes tab variants today (1st Home,
 * 2nd Community, 3rd Subspaces, 4th+ custom/Knowledge). The literal lists below duplicate
 * `innovation.flow.state.sidebar.defaults.ts` deliberately: migrations must stay
 * self-contained and immutable, so they cannot import application code that might change
 * shape later.
 *
 * Three branches, in this order:
 *
 *   Branch A — L0 space-owned states:
 *     Join path: innovation_flow_state → innovation_flow → collaboration → space
 *                (space."collaborationId" = collaboration.id, space.level = 0).
 *     Ranked by ROW_NUMBER() per flow (sortOrder, then id as a stable tiebreak);
 *     position 1/2/3/4+ gets the matching per-tab default list (see the literals below).
 *
 *   Branch B — L0 template-owned states:
 *     Same shape, joined through template_content_space instead of space
 *     (template_content_space."collaborationId" = collaboration.id, level = 0).
 *     MUST run before Branch C, or these rows fall through to the generic default.
 *
 *   Branch C — catch-all (L1/L2 spaces, non-L0 templates, orphaned states):
 *     Every remaining row still missing `sidebar` gets `[intent, index]` — the same
 *     generic default the create path and read normalization already use.
 *
 * Idempotent: every statement is guarded `settings -> 'sidebar' IS NULL`, so re-running
 * is a no-op and admin-chosen values (set after this migration ran) are never overwritten.
 *
 * Rollback note: `down()` is an intentional no-op, following the precedent of
 * BackfillInnovationFlowStateLayout. `sidebar` is an additive JSONB key that pre-feature
 * code ignores, and admins can edit it after this migration runs — stripping it on
 * rollback would silently delete those later edits.
 */
export class BackfillInnovationFlowStateSidebar1786600000000
  implements MigrationInterface
{
  name = 'BackfillInnovationFlowStateSidebar1786600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ count: before }] = await queryRunner.query(`
      SELECT COUNT(*) AS count FROM innovation_flow_state
      WHERE settings -> 'sidebar' IS NULL
    `);
    console.log(
      `[Migration] BackfillInnovationFlowStateSidebar: ${before} flow state(s) require sidebar backfill`
    );

    // Branch A: L0 space-owned states, positional (see the class doc comment). The ranking CTE deliberately
    // ranks EVERY state in the flow (not just the ones still missing sidebar) — position
    // must reflect each state's real place in the tab order regardless of which rows a
    // prior partial run already backfilled, or a state that already has row 1 backfilled
    // would shift row 2 into position 1's default on a later run.
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          ifs.id,
          ROW_NUMBER() OVER (
            PARTITION BY ifs."innovationFlowId"
            ORDER BY ifs."sortOrder" ASC, ifs.id ASC
          ) AS position
        FROM innovation_flow_state ifs
        JOIN collaboration c ON ifs."innovationFlowId" = c."innovationFlowId"
        JOIN space s ON s."collaborationId" = c.id AND s.level = 0
      )
      UPDATE innovation_flow_state ifs
      SET settings = jsonb_set(
        ifs.settings,
        '{sidebar}',
        CASE ranked.position
          WHEN 1 THEN '["intent","about","subspaceLinks","events","updates"]'::jsonb
          WHEN 2 THEN '["intent","contactLeads","addUser","virtualContributors","guidelines"]'::jsonb
          WHEN 3 THEN '["intent"]'::jsonb
          ELSE '["intent","index"]'::jsonb
        END,
        true
      )
      FROM ranked
      WHERE ifs.id = ranked.id
        AND ifs.settings -> 'sidebar' IS NULL
    `);

    // Branch B: L0 template-owned states. Must run before Branch C, or these rows fall
    // through to the generic default instead of the positional one. Same full-partition
    // ranking rationale as Branch A.
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          ifs.id,
          ROW_NUMBER() OVER (
            PARTITION BY ifs."innovationFlowId"
            ORDER BY ifs."sortOrder" ASC, ifs.id ASC
          ) AS position
        FROM innovation_flow_state ifs
        JOIN collaboration c ON ifs."innovationFlowId" = c."innovationFlowId"
        JOIN template_content_space tcs
          ON tcs."collaborationId" = c.id AND tcs.level = 0
      )
      UPDATE innovation_flow_state ifs
      SET settings = jsonb_set(
        ifs.settings,
        '{sidebar}',
        CASE ranked.position
          WHEN 1 THEN '["intent","about","subspaceLinks","events","updates"]'::jsonb
          WHEN 2 THEN '["intent","contactLeads","addUser","virtualContributors","guidelines"]'::jsonb
          WHEN 3 THEN '["intent"]'::jsonb
          ELSE '["intent","index"]'::jsonb
        END,
        true
      )
      FROM ranked
      WHERE ifs.id = ranked.id
        AND ifs.settings -> 'sidebar' IS NULL
    `);

    // Branch C: catch-all — L1/L2 space flows, non-L0 templates, and orphaned states.
    await queryRunner.query(`
      UPDATE innovation_flow_state
      SET settings = jsonb_set(settings, '{sidebar}', '["intent","index"]'::jsonb, true)
      WHERE settings -> 'sidebar' IS NULL
    `);

    // Verify: the failure mode of this migration is silently backfilling nothing, so assert
    // that no row is left without a sidebar key.
    const [{ count: residual }] = await queryRunner.query(`
      SELECT COUNT(*) AS count FROM innovation_flow_state
      WHERE settings -> 'sidebar' IS NULL
    `);
    if (Number(residual) > 0) {
      console.warn(
        `[Migration] WARNING BackfillInnovationFlowStateSidebar: ${residual} flow state(s) still missing sidebar after backfill — investigate before proceeding`
      );
    } else {
      console.log(
        '[Migration] BackfillInnovationFlowStateSidebar: verification passed — 0 flow states missing a sidebar list'
      );
    }
  }

  // Intentional no-op — see the "Rollback note" above.
  public async down(_queryRunner: QueryRunner): Promise<void> {
    console.log(
      '[Migration] BackfillInnovationFlowStateSidebar: down() is an intentional no-op — the additive sidebar JSONB key is left in place'
    );
    return;
  }
}
