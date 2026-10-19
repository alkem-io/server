import { MigrationInterface, QueryRunner } from 'typeorm';

// The in-scope (owned) and untouched flow sets, shared verbatim by the count, the rewrite
// and the residual check so all three use exactly the same predicate.
const OWNED_AND_UNTOUCHED_FLOWS = `
  owned AS (
    SELECT c."innovationFlowId" AS flow_id
    FROM collaboration c
    JOIN space s ON s."collaborationId" = c.id AND s.level IN (1, 2)
    WHERE c."innovationFlowId" IS NOT NULL
    UNION
    SELECT c."innovationFlowId" AS flow_id
    FROM collaboration c
    JOIN template_content_space tcs ON tcs."collaborationId" = c.id AND tcs.level IN (1, 2)
    WHERE c."innovationFlowId" IS NOT NULL
  ),
  owned_with_states AS (
    SELECT DISTINCT ifs."innovationFlowId" AS flow_id
    FROM innovation_flow_state ifs
    JOIN owned o ON o.flow_id = ifs."innovationFlowId"
  ),
  untouched AS (
    SELECT ifs."innovationFlowId" AS flow_id
    FROM innovation_flow_state ifs
    JOIN owned o ON o.flow_id = ifs."innovationFlowId"
    GROUP BY ifs."innovationFlowId"
    HAVING bool_and(
      jsonb_typeof(ifs.settings -> 'sidebar') IS DISTINCT FROM 'array'
      OR ifs.settings -> 'sidebar' = '["intent","createPost","applicationButton","search","index"]'::jsonb
    )
  )
`;

/**
 * Rewrites the sidebar lists of every UNTOUCHED subspace (L1/L2) innovation flow to the
 * positional subspace defaults, so that subspace pages — which now render their sidebar from
 * the flow's FIRST state — keep showing exactly the sidebar they hard-coded before.
 *
 * Scope: flows owned by a `space` of level 1 or 2, plus flows owned by a
 * `template_content_space` of level 1 or 2 (the platform subspace template and every Space's
 * own default subspace template — new subspaces copy those, so rewriting them keeps newly
 * created subspaces right too). Top-level (L0) flows, L0 templates and orphan flows (owned by
 * neither) are never touched. Join path: innovation_flow_state → collaboration (by
 * "innovationFlowId") → space / template_content_space (by "collaborationId").
 *
 * "Untouched" (per flow): the flow has at least one state AND every state's stored list is
 * either the pre-existing generic list `["intent","createPost","applicationButton","search",
 * "index"]` (order-sensitive) or not an array at all (missing key, JSON null, scalar — the
 * read path serves those as the generic list, so they look untouched). `[]` is explicit
 * admin configuration and therefore counts as touched. A flow with ANY other list is left
 * entirely alone: it already renders what its admin (or an applied template) chose, and it
 * is reported in the "skipped" count — the population whose subspace sidebar changes
 * visibly after the upgrade.
 *
 * Null safety: the predicate only compares `jsonb_typeof` and whole-value equality; no
 * array-length function is ever evaluated, because one non-array row would abort the whole
 * statement.
 *
 * Rewrite: every state of an untouched flow is ranked by ("sortOrder" ASC, id ASC) — the
 * same ordering rule the application uses to pick the first state — and gets position 1 →
 * the subspace sidebar, 2 → the L0 tab-2 list, 3 → the L0 tab-3 list, 4+ → the generic list.
 * The literal lists duplicate `innovation.flow.state.sidebar.defaults.ts`
 * (`resolveSubspaceDefaultSidebar`) deliberately: migrations must stay self-contained and
 * immutable. A static spec asserts the literals equal the resolver's output.
 *
 * Idempotent: after the rewrite position 1 holds the subspace list, which differs from the
 * generic list, so a rewritten flow is no longer untouched and a second run rewrites zero.
 *
 * Verification: the untouched count is recomputed with the same predicate after the
 * rewrite; anything above zero throws, which rolls the migration transaction back.
 *
 * Rollback note: `down()` is an intentional no-op. Previous code ignores subspace lists
 * entirely, and a selective revert cannot tell rewritten rows apart from later admin edits
 * or from flows created after the upgrade.
 */
export class SubspaceSidebarPositionalDefaults1791100000000
  implements MigrationInterface
{
  name = 'SubspaceSidebarPositionalDefaults1791100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ in_scope: inScope, untouched }] = await queryRunner.query(`
      WITH ${OWNED_AND_UNTOUCHED_FLOWS}
      SELECT
        (SELECT COUNT(*) FROM owned_with_states) AS in_scope,
        (SELECT COUNT(*) FROM untouched) AS untouched
    `);
    const skipped = Number(inScope) - Number(untouched);
    console.log(
      `[Migration] SubspaceSidebarPositionalDefaults: in-scope L1/L2 flows = ${inScope}`
    );
    console.log(
      `[Migration] SubspaceSidebarPositionalDefaults: untouched (to rewrite) = ${untouched}`
    );
    console.log(
      `[Migration] SubspaceSidebarPositionalDefaults: skipped (touched, will render stored lists) = ${skipped}`
    );

    await queryRunner.query(`
      WITH ${OWNED_AND_UNTOUCHED_FLOWS},
      ranked AS (
        SELECT
          ifs.id,
          ROW_NUMBER() OVER (
            PARTITION BY ifs."innovationFlowId"
            ORDER BY ifs."sortOrder" ASC, ifs.id ASC
          ) AS position
        FROM innovation_flow_state ifs
        JOIN untouched u ON u.flow_id = ifs."innovationFlowId"
      )
      UPDATE innovation_flow_state ifs
      SET settings = jsonb_set(
        COALESCE(ifs.settings, '{}'::jsonb),
        '{sidebar}',
        CASE r.position
          WHEN 1 THEN '["intent","about","createPost","community","events","activity","index","subspaceLinks","virtualContributors","updates"]'::jsonb
          WHEN 2 THEN '["intent","createPost","search","applicationButton","contactLeads","addUser","virtualContributors","guidelines"]'::jsonb
          WHEN 3 THEN '["intent","createSubspace","createPost","search","applicationButton"]'::jsonb
          ELSE '["intent","createPost","applicationButton","search","index"]'::jsonb
        END,
        true
      )
      FROM ranked r
      WHERE r.id = ifs.id
    `);

    const [{ count: residual }] = await queryRunner.query(`
      WITH ${OWNED_AND_UNTOUCHED_FLOWS}
      SELECT COUNT(*) AS count FROM untouched
    `);
    if (Number(residual) > 0) {
      throw new Error(
        `SubspaceSidebarPositionalDefaults: ${residual} untouched L1/L2 flow(s) remain after the rewrite — rolling back; investigate before re-running`
      );
    }
    console.log(
      '[Migration] SubspaceSidebarPositionalDefaults: verification passed — 0 untouched L1/L2 flows'
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    console.log(
      '[Migration] SubspaceSidebarPositionalDefaults: down() is an intentional no-op — see the rollback note on the class'
    );
  }
}
