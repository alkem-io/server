import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Appends the two new forum discussion categories — `newsletter` and
 * `tips-and-tricks` (spec 060 FR-001..003) — to the single `forum` row's
 * `discussionCategories` column (`simple-array`, comma-joined text).
 *
 * There is exactly one Forum row (the platform singleton), so this migration
 * is a plain read-modify-write inside its own transaction: no
 * `@VersionColumn` contention to reason about, no batching. Append-if-missing
 * per value keeps the migration idempotent on re-run (house convention).
 *
 * Deliberately data-only: the two `ForumDiscussionCategory` enum members
 * already exist as of this release's code (append-only vocabulary, spec
 * A-02) — this migration only widens what the *active* list currently
 * offers. Running the migration before the code deploys is a no-op-adjacent
 * risk (the column would carry values a not-yet-deployed server doesn't
 * recognise); the rollout runbook (plan.md) mandates code-first ordering,
 * and the read-side known-member filter (FR-007) makes any misordering or
 * rollback inert rather than fatal.
 *
 * Rollback note: `down()` removes exactly the two values this migration
 * added, and only if still present — it does not touch any other stored
 * value (including any the operator added by hand in between).
 */
export class AddForumCategoriesNewsletterTipsTricks1788300000000
  implements MigrationInterface
{
  name = 'AddForumCategoriesNewsletterTipsTricks1788300000000';

  private readonly addedCategories = ['newsletter', 'tips-and-tricks'];

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

      const missing = this.addedCategories.filter(
        category => !existing.includes(category)
      );
      if (missing.length === 0) {
        continue;
      }

      const updated = [...existing, ...missing].join(',');
      await queryRunner.query(
        `UPDATE forum SET "discussionCategories" = $1 WHERE id = $2`,
        [updated, row.id]
      );
      console.log(
        `[Migration] AddForumCategoriesNewsletterTipsTricks: appended ${JSON.stringify(
          missing
        )} to forum ${row.id}`
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
        )} from forum ${row.id} (if present)`
      );
    }
  }
}
