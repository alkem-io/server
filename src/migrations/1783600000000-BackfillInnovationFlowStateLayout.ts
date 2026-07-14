import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills per-phase presentation settings (feature 021-flow-state-post-layout,
 * FR-009) into the JSONB `settings` of every `innovation_flow_state` row.
 *
 * Three-branch approach:
 *
 *   Branch A — space-owned states:
 *     Join path: space → space."collaborationId" → collaboration."innovationFlowId"
 *                       → innovation_flow_state."innovationFlowId"
 *     Value: the owning space's layout.calloutDescriptionDisplayMode.
 *     Covers ALL space levels (L0/L1/L2 — FR-009/FR-017).
 *
 *   Branch A2 — template-owned states:
 *     `template_content_space` also owns a collaboration, and carries its own
 *     `settings.layout.calloutDescriptionDisplayMode`. Without this branch those states
 *     fall through to Branch B and are blanket-set to 'expanded', discarding the template's
 *     real value — and `InputCreatorService` copies state settings verbatim when a template
 *     is applied, so every space created from that template would silently render Expanded
 *     even though the admin saved it as Collapsed. Must run BEFORE Branch B.
 *
 *   Branch B — remaining states (orphaned: reachable from no space and no template):
 *     Set `descriptionDisplayMode` to 'expanded' where still absent.
 *
 *   All states: set `showPublishDetails` to true where absent.
 *
 * The source value is allow-listed (CASE ... IN ('expanded','collapsed')) rather than copied
 * verbatim: it lands in a NonNull GraphQL enum, so any legacy or hand-edited out-of-enum
 * string would break the tab query for every viewer of that space.
 *
 * Idempotent: every statement is guarded `settings -> '<key>' IS NULL` so
 * re-running is a no-op and admin-chosen values are never overwritten (US4-AS4).
 *
 * Rollback note: `down()` is an intentional no-op. `descriptionDisplayMode` and
 * `showPublishDetails` are additive JSONB keys that pre-feature code ignores, and admins
 * can edit them after this migration runs. Stripping them on rollback would silently
 * delete those later edits, so we leave the keys in place — rolling the feature back does
 * not require removing them.
 *
 * JSONB stores the lowercase TypeScript enum values ('expanded'/'collapsed')
 * exactly as the space layout JSONB does — the GraphQL layer serialises them to
 * the uppercase enum names (EXPANDED/COLLAPSED).
 */
export class BackfillInnovationFlowStateLayout1783600000000
  implements MigrationInterface
{
  name = 'BackfillInnovationFlowStateLayout1783600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ count: before }] = await queryRunner.query(`
      SELECT COUNT(*) AS count FROM innovation_flow_state
      WHERE settings -> 'descriptionDisplayMode' IS NULL
    `);
    console.log(
      `[Migration] BackfillInnovationFlowStateLayout: ${before} flow state(s) require descriptionDisplayMode backfill`
    );

    // Branch A: space-owned states — copy the owning space's calloutDescriptionDisplayMode.
    // The CASE allow-lists the value (defaults 'expanded' for absent/legacy/out-of-enum).
    await queryRunner.query(`
      UPDATE innovation_flow_state ifs
      SET settings = jsonb_set(
        ifs.settings,
        '{descriptionDisplayMode}',
        to_jsonb(
          CASE
            WHEN s.settings->'layout'->>'calloutDescriptionDisplayMode'
              IN ('expanded', 'collapsed')
            THEN s.settings->'layout'->>'calloutDescriptionDisplayMode'
            ELSE 'expanded'
          END
        ),
        true
      )
      FROM collaboration c
      JOIN space s ON s."collaborationId" = c.id
      WHERE ifs."innovationFlowId" = c."innovationFlowId"
        AND ifs.settings -> 'descriptionDisplayMode' IS NULL
    `);

    // Branch A2: template-owned states — copy the owning template content space's value.
    // MUST run before Branch B, or these rows get the blanket 'expanded' default instead.
    await queryRunner.query(`
      UPDATE innovation_flow_state ifs
      SET settings = jsonb_set(
        ifs.settings,
        '{descriptionDisplayMode}',
        to_jsonb(
          CASE
            WHEN tcs.settings->'layout'->>'calloutDescriptionDisplayMode'
              IN ('expanded', 'collapsed')
            THEN tcs.settings->'layout'->>'calloutDescriptionDisplayMode'
            ELSE 'expanded'
          END
        ),
        true
      )
      FROM collaboration c
      JOIN template_content_space tcs ON tcs."collaborationId" = c.id
      WHERE ifs."innovationFlowId" = c."innovationFlowId"
        AND ifs.settings -> 'descriptionDisplayMode' IS NULL
    `);

    // Branch B: remaining states (orphaned) not reached by branch A or A2.
    await queryRunner.query(`
      UPDATE innovation_flow_state
      SET settings = jsonb_set(settings, '{descriptionDisplayMode}', '"expanded"'::jsonb, true)
      WHERE settings -> 'descriptionDisplayMode' IS NULL
    `);

    // All states: default showPublishDetails to true where absent.
    await queryRunner.query(`
      UPDATE innovation_flow_state
      SET settings = jsonb_set(settings, '{showPublishDetails}', 'true'::jsonb, true)
      WHERE settings -> 'showPublishDetails' IS NULL
    `);

    // Verify: the failure mode of this migration is silently backfilling nothing, so assert
    // that no row is left without a key or carrying an out-of-enum descriptionDisplayMode.
    const [{ count: residual }] = await queryRunner.query(`
      SELECT COUNT(*) AS count FROM innovation_flow_state
      WHERE settings -> 'descriptionDisplayMode' IS NULL
         OR settings -> 'showPublishDetails' IS NULL
         OR settings ->> 'descriptionDisplayMode' NOT IN ('expanded', 'collapsed')
    `);
    if (Number(residual) > 0) {
      console.warn(
        `[Migration] WARNING BackfillInnovationFlowStateLayout: ${residual} flow state(s) still missing or carrying an invalid descriptionDisplayMode/showPublishDetails after backfill — investigate before proceeding`
      );
    } else {
      console.log(
        '[Migration] BackfillInnovationFlowStateLayout: verification passed — 0 flow states missing per-phase layout settings'
      );
    }
  }

  // Intentional no-op — see the "Rollback note" above. The two JSONB keys are additive and
  // ignored by pre-feature code; stripping them here would delete admin edits made after the
  // migration ran. Leaving them in place is the non-destructive choice.
  public async down(_queryRunner: QueryRunner): Promise<void> {
    console.log(
      '[Migration] BackfillInnovationFlowStateLayout: down() is an intentional no-op — the additive JSONB keys are left in place'
    );
    return;
  }
}
