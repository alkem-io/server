import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills per-phase presentation settings (feature 021-flow-state-post-layout,
 * FR-009) into the JSONB `settings` of every `innovation_flow_state` row.
 *
 * Two-branch approach (data-model.md §Migration):
 *
 *   Branch A — space-owned states:
 *     Join path: space → space."collaborationId" → collaboration."innovationFlowId"
 *                       → innovation_flow_state."innovationFlowId"
 *     Value: COALESCE(space.settings->'layout'->>'calloutDescriptionDisplayMode', 'expanded')
 *     Covers ALL space levels (L0/L1/L2 — FR-009/FR-017).
 *
 *   Branch B — remaining states (template-owned, orphaned):
 *     Set `descriptionDisplayMode` to 'expanded' where still absent.
 *
 *   All states: set `showPublishDetails` to true where absent.
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
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Branch A: space-owned states — copy the owning space's calloutDescriptionDisplayMode.
    // The COALESCE handles spaces whose layout block predates the enum (defaults 'expanded').
    await queryRunner.query(`
      UPDATE innovation_flow_state ifs
      SET settings = jsonb_set(
        ifs.settings,
        '{descriptionDisplayMode}',
        to_jsonb(
          COALESCE(
            s.settings->'layout'->>'calloutDescriptionDisplayMode',
            'expanded'
          )
        ),
        true
      )
      FROM collaboration c
      JOIN space s ON s."collaborationId" = c.id
      WHERE ifs."innovationFlowId" = c."innovationFlowId"
        AND ifs.settings -> 'descriptionDisplayMode' IS NULL
    `);

    // Branch B: remaining states (template-owned or orphaned) not reached by branch A.
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
  }

  // Intentional no-op — see the "Rollback note" above. The two JSONB keys are additive and
  // ignored by pre-feature code; stripping them here would delete admin edits made after the
  // migration ran. Leaving them in place is the non-destructive choice.
  public async down(_queryRunner: QueryRunner): Promise<void> {
    return;
  }
}
