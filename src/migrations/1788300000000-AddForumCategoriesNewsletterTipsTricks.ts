import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the two new forum discussion categories — `newsletter` and
 * `tips-and-tricks` — to the single `forum` row's `discussionCategories`
 * column (`simple-array`, comma-joined text), and reorders the column so its
 * stored order matches the platform's canonical display order (the
 * `ForumDiscussionCategory` enum's declaration order).
 *
 * There is exactly one Forum row (the platform singleton), so this migration
 * is a plain read-modify-write inside its own transaction: no
 * `@VersionColumn` contention to reason about, no batching.
 *
 * The output for each row is derived, never hardcoded, as: canonical order
 * filtered down to "already present, or one of the two values this
 * migration adds" — followed by any value the column carries that isn't in
 * the canonical list at all, in its original relative order. That
 * derivation gives the migration three properties:
 *
 * - **Idempotent**: re-running it recomputes the same derivation from
 *   whatever is already stored, so a second run is a no-op (the row is
 *   written unconditionally, but to an unchanged value).
 * - **Retirement-safe**: a category retired via
 *   `adminForumRemoveDiscussionCategory` before this migration runs is
 *   absent from the row, so it is filtered out of the canonical order same
 *   as it would be by hand — reordering never resurrects it. Only the two
 *   named categories are ever added to what's missing.
 * - **Unknown-value tolerant**: a stored value the current enum doesn't
 *   recognise (hand-edited, or from a category retired from the vocabulary
 *   in some future release) is kept, appended after the known ones, rather
 *   than dropped. The read-side known-member filter already hides it from
 *   the API, so preserving it costs nothing and avoids ever discarding
 *   data in a migration.
 *
 * Deliberately data-only: the two `ForumDiscussionCategory` enum members
 * already exist as of this release's code (the vocabulary is append-only) —
 * this migration only changes what the *active* list currently offers and
 * the order it's offered in. Running the migration before the code deploys
 * is a no-op-adjacent risk (the column would carry values, or an order, a
 * not-yet-deployed server doesn't recognise); the rollout runbook (plan.md)
 * mandates code-first ordering, and the read-side known-member filter makes
 * any misordering or rollback inert rather than fatal.
 *
 * Rollback note: `down()` removes exactly the two values this migration
 * added, and only if still present — it does not touch any other stored
 * value (including any the operator added by hand in between), and it does
 * NOT attempt to restore whatever order the row had before this migration
 * ran, because that prior order was never recorded anywhere `down()` can
 * read it back from.
 */
export class AddForumCategoriesNewsletterTipsTricks1788300000000
  implements MigrationInterface
{
  name = 'AddForumCategoriesNewsletterTipsTricks1788300000000';

  private readonly addedCategories = ['newsletter', 'tips-and-tricks'];

  /**
   * The platform's canonical display order, mirrored from the
   * `ForumDiscussionCategory` enum's declaration order. A migration must
   * not import application source (its behaviour has to stay fixed to this
   * point in history regardless of later enum edits), so the order is
   * copied here rather than imported.
   */
  private readonly canonicalOrder = [
    'releases',
    'newsletter',
    'tips-and-tricks',
    'help',
    'platform-functionalities',
    'community-building',
    'challenge-centric',
    'other',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: { id: string; discussionCategories: string | null }[] =
      await queryRunner.query(
        `SELECT id, "discussionCategories" FROM forum`
      );

    for (const row of rows) {
      const existing = (row.discussionCategories ?? '')
        .split(',')
        .map(value => value.trim())
        .filter(value => value.length > 0);

      const present = new Set([...existing, ...this.addedCategories]);

      const known = this.canonicalOrder.filter(category =>
        present.has(category)
      );
      const unknown = existing.filter(
        value => !this.canonicalOrder.includes(value)
      );

      const updated = [...known, ...unknown].join(',');
      if (updated === existing.join(',')) {
        continue;
      }

      await queryRunner.query(
        `UPDATE forum SET "discussionCategories" = $1 WHERE id = $2`,
        [updated, row.id]
      );
      console.log(
        `[Migration] AddForumCategoriesNewsletterTipsTricks: reordered forum ${row.id} to ${JSON.stringify(
          updated
        )}`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rows: { id: string; discussionCategories: string | null }[] =
      await queryRunner.query(
        `SELECT id, "discussionCategories" FROM forum`
      );

    for (const row of rows) {
      const existing = (row.discussionCategories ?? '')
        .split(',')
        .map(value => value.trim())
        .filter(value => value.length > 0);

      const remaining = existing.filter(
        value => !this.addedCategories.includes(value)
      );
      if (remaining.length === existing.length) {
        continue;
      }

      await queryRunner.query(
        `UPDATE forum SET "discussionCategories" = $1 WHERE id = $2`,
        [remaining.join(','), row.id]
      );
      console.log(
        `[Migration] AddForumCategoriesNewsletterTipsTricks (down): removed ${JSON.stringify(
          this.addedCategories
        )} from forum ${row.id} (if present); prior order is not restored`
      );
    }
  }
}
