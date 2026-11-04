import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Re-synchronises every innovation flow's flow-state tagset template with the
 * flow's actual states.
 *
 * The flow-state tagset template is the vocabulary that callout creation and
 * callout transfer validate a callout's flow-state tag against. It is meant to
 * mirror the flow's states exactly: `allowedValues` lists the state display
 * names in `sortOrder`, and `defaultSelectedValue` names the current state (or
 * the first state when no current state is set). In practice the two drifted
 * apart: applying an innovation-flow template wrote the template correctly and
 * then re-persisted a stale copy through a cascading save, and adding or
 * deleting a single state never touched the template at all. The result was a
 * vocabulary that still listed states which no longer existed, which made
 * transfers reject valid callouts and left callouts tagged with names no
 * longer present in their flow.
 *
 * The repair is three set-based updates, each driven by the same
 * `flow_states` aggregate over `innovation_flow` joined to
 * `innovation_flow_state`. Only flows that reference a template and have at
 * least one state are selected — the inner join guarantees both — so
 * stateless or template-less flows are skipped rather than corrupted.
 *
 *  1. `tagset_template.allowedValues` converges to the comma-joined state
 *     display names ordered by `sortOrder`. Guarded by `IS DISTINCT FROM` so an
 *     already-correct template is not rewritten.
 *  2. `tagset_template.defaultSelectedValue` converges to the current state's
 *     display name when `currentStateID` names one of the flow's states, and to
 *     the first state's display name otherwise. Guarded so a default that is
 *     already one of the state names is left untouched.
 *  3. Every callout `tagset` of name `flow-state` attached to the template whose
 *     tag no longer matches any state name (case-insensitively) is moved to the
 *     repaired default from step 2. Tags that already match a state are left as
 *     they are.
 *
 * Statement order matters: step 3 reads the default that step 2 has already
 * repaired. On an already-converged database every step updates zero rows, so
 * re-running the migration is a no-op.
 */
export class ResyncFlowStateTagsetTemplates1789000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: allowedValues := state display names in sortOrder.
    await queryRunner.query(`
      WITH flow_states AS (
        SELECT
          f.id AS flow_id,
          f."flowStatesTagsetTemplateId" AS template_id,
          f."currentStateID",
          string_agg(s."displayName", ',' ORDER BY s."sortOrder") AS names,
          array_agg(s."displayName" ORDER BY s."sortOrder") AS name_array,
          (array_agg(s."displayName" ORDER BY s."sortOrder"))[1] AS first_name,
          max(s."displayName") FILTER (WHERE s.id::text = f."currentStateID"::text) AS current_name
        FROM innovation_flow f
        JOIN innovation_flow_state s ON s."innovationFlowId" = f.id
        WHERE f."flowStatesTagsetTemplateId" IS NOT NULL
        GROUP BY f.id
      )
      UPDATE tagset_template tt
      SET "allowedValues" = fs.names
      FROM flow_states fs
      WHERE tt.id = fs.template_id
        AND tt."allowedValues" IS DISTINCT FROM fs.names
    `);

    // Step 2: defaultSelectedValue := current state's name, else first state's name.
    await queryRunner.query(`
      WITH flow_states AS (
        SELECT
          f.id AS flow_id,
          f."flowStatesTagsetTemplateId" AS template_id,
          f."currentStateID",
          string_agg(s."displayName", ',' ORDER BY s."sortOrder") AS names,
          array_agg(s."displayName" ORDER BY s."sortOrder") AS name_array,
          (array_agg(s."displayName" ORDER BY s."sortOrder"))[1] AS first_name,
          max(s."displayName") FILTER (WHERE s.id::text = f."currentStateID"::text) AS current_name
        FROM innovation_flow f
        JOIN innovation_flow_state s ON s."innovationFlowId" = f.id
        WHERE f."flowStatesTagsetTemplateId" IS NOT NULL
        GROUP BY f.id
      )
      UPDATE tagset_template tt
      SET "defaultSelectedValue" = COALESCE(fs.current_name, fs.first_name)
      FROM flow_states fs
      WHERE tt.id = fs.template_id
        AND (
          tt."defaultSelectedValue" IS NULL
          OR tt."defaultSelectedValue" <> ALL(fs.name_array)
        )
    `);

    // Step 3: stranded callout flow-state tags := the repaired default.
    await queryRunner.query(`
      WITH flow_states AS (
        SELECT
          f.id AS flow_id,
          f."flowStatesTagsetTemplateId" AS template_id,
          f."currentStateID",
          string_agg(s."displayName", ',' ORDER BY s."sortOrder") AS names,
          array_agg(s."displayName" ORDER BY s."sortOrder") AS name_array,
          (array_agg(s."displayName" ORDER BY s."sortOrder"))[1] AS first_name,
          max(s."displayName") FILTER (WHERE s.id::text = f."currentStateID"::text) AS current_name
        FROM innovation_flow f
        JOIN innovation_flow_state s ON s."innovationFlowId" = f.id
        WHERE f."flowStatesTagsetTemplateId" IS NOT NULL
        GROUP BY f.id
      )
      UPDATE tagset t
      SET tags = tt."defaultSelectedValue"
      FROM tagset_template tt
      JOIN flow_states fs ON fs.template_id = tt.id
      WHERE t."tagsetTemplateId" = tt.id
        AND t.name = 'flow-state'
        AND lower(t.tags) <> ALL(SELECT lower(unnest(fs.name_array)))
    `);
  }

  /**
   * Intentionally a no-op. The values this migration overwrote were
   * inconsistent data — a vocabulary that disagreed with its own flow's states
   * — not a schema state worth restoring. Reinstating them would only
   * reintroduce the drift.
   */
  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
