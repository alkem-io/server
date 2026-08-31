import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Inserts the `search` widget into every stored per-tab sidebar list that predates it, so
 * upgrading a Space (or template, or orphaned state) does not silently lose search once the
 * in-content search row is removed from the product.
 *
 * Placement follows one content-based rule, applied to every row identically regardless of
 * owner (top-level Space, subspace at any level, space/flow template, orphan) and regardless
 * of whether the list is a platform default or an admin-edited one:
 *
 *   (a) immediately before the first `index`, if present;
 *   (b) else immediately after the last of `createSubspace`/`createPost`, if either is
 *       present;
 *   (c) else appended at the end.
 *
 * Fixture truth table (verified on PostgreSQL 17.5):
 *
 *   [intent, about, createPost, applicationButton, subspaceLinks, events, updates]
 *     -> [intent, about, createPost, search, applicationButton, subspaceLinks, events, updates]
 *   [intent, createPost, applicationButton, contactLeads, addUser, virtualContributors, guidelines]
 *     -> [intent, createPost, search, applicationButton, contactLeads, addUser, virtualContributors, guidelines]
 *   [intent, createSubspace, createPost, applicationButton]
 *     -> [intent, createSubspace, createPost, search, applicationButton]
 *   [intent, createPost, applicationButton, index]
 *     -> [intent, createPost, applicationButton, search, index]
 *   []                                        -> [] (skipped — explicit admin configuration)
 *   [intent, search, index]                   -> unchanged (idempotent)
 *   [intent, about, events]                   -> [intent, about, events, search]
 *   [index, intent]                           -> [search, index, intent]
 *   [intent, createPost, createSubspace]      -> [intent, createPost, createSubspace, search]
 *   [createPost, index, createSubspace]       -> [createPost, search, index, createSubspace]
 *   null / scalar / missing key               -> untouched (served as the generic default on read)
 *
 * Guard (idempotent, null-safe): `jsonb_typeof(settings -> 'sidebar') = 'array' AND
 * settings -> 'sidebar' <> '[]'::jsonb AND NOT (settings -> 'sidebar' @> '["search"]'::jsonb)`.
 * A prior backfill's `sidebar IS NULL OR jsonb_typeof(...) <> 'array'` guard is now vacuous
 * (every row is an array) and, more importantly, wrong here: this migration must NOT touch
 * `null`/scalar/missing rows (they are read-normalized to the generic default, which already
 * includes `search`) or empty arrays (an admin's deliberate empty sidebar, per prior FR-016).
 * The WHERE also never calls `jsonb_array_length` directly — that aborts the whole statement
 * on a `"sidebar": null` row ("cannot get array length of a scalar"; predicates are not
 * short-circuited) — `jsonb_array_length` is only ever evaluated inside the `COALESCE` of the
 * insertion index, which is reached solely for rows the outer WHERE already proved are arrays.
 *
 * `[]` is skipped deliberately: an admin who emptied a sidebar made that choice explicitly,
 * and the residual invariant this migration enforces is "every non-empty list contains
 * `search`", not "every list is non-empty".
 *
 * Rollback note: `down()` is an intentional no-op. `search` is additive JSONB content that
 * pre-feature code ignores, and admins may edit the list again after this migration runs —
 * stripping it on rollback would silently delete those later edits.
 */
export class AddSearchSidebarWidget1788100000000 implements MigrationInterface {
  name = 'AddSearchSidebarWidget1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ count: before }] = await queryRunner.query(`
      SELECT COUNT(*) AS count FROM innovation_flow_state
      WHERE jsonb_typeof(settings -> 'sidebar') = 'array'
        AND settings -> 'sidebar' <> '[]'::jsonb
        AND NOT (settings -> 'sidebar' @> '["search"]'::jsonb)
    `);
    console.log(
      `[Migration] AddSearchSidebarWidget: ${before} flow state(s) require the search widget`
    );

    // The ONE update: insert "search" before the first "index", else after the last create
    // button, else append. ORDINALITY is 1-based, so MIN(o) - 1 is the 0-based index of
    // "index" (insert immediately before it) and MAX(o) is the 0-based index right after the
    // last create button; an index equal to the array length appends via jsonb_insert.
    await queryRunner.query(`
      UPDATE innovation_flow_state
      SET settings = jsonb_set(
        settings,
        '{sidebar}',
        jsonb_insert(
          settings -> 'sidebar',
          ARRAY[COALESCE(
            (SELECT MIN(o) - 1 FROM jsonb_array_elements_text(settings -> 'sidebar') WITH ORDINALITY t(v, o) WHERE v = 'index'),
            (SELECT MAX(o) FROM jsonb_array_elements_text(settings -> 'sidebar') WITH ORDINALITY t(v, o) WHERE v IN ('createSubspace', 'createPost')),
            jsonb_array_length(settings -> 'sidebar')
          )::text],
          '"search"'::jsonb
        ),
        true
      )
      WHERE jsonb_typeof(settings -> 'sidebar') = 'array'
        AND settings -> 'sidebar' <> '[]'::jsonb
        AND NOT (settings -> 'sidebar' @> '["search"]'::jsonb)
    `);

    // Verify: MUST leave zero rows still satisfying the same predicate, or fail (rolling
    // back the transaction) rather than shipping a partial insert.
    const [{ count: residual }] = await queryRunner.query(`
      SELECT COUNT(*) AS count FROM innovation_flow_state
      WHERE jsonb_typeof(settings -> 'sidebar') = 'array'
        AND settings -> 'sidebar' <> '[]'::jsonb
        AND NOT (settings -> 'sidebar' @> '["search"]'::jsonb)
    `);
    if (Number(residual) > 0) {
      throw new Error(
        `AddSearchSidebarWidget: ${residual} non-empty flow state sidebar(s) still lack "search" after the update — rolling back; investigate before re-running`
      );
    }
    console.log(
      '[Migration] AddSearchSidebarWidget: verification passed — 0 non-empty sidebars without "search"'
    );
  }

  // Intentional no-op — see the "Rollback note" above.
  public async down(_queryRunner: QueryRunner): Promise<void> {
    console.log(
      '[Migration] AddSearchSidebarWidget: down() is an intentional no-op — the additive "search" entry is left in place'
    );
    return;
  }
}
