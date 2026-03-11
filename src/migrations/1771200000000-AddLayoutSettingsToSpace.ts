import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLayoutSettingsToSpace1771200000000
  implements MigrationInterface
{
  name = 'AddLayoutSettingsToSpace1771200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Count spaces that need backfilling before applying the update.
    const beforeRows = await queryRunner.query(`
      SELECT COUNT(*) AS count FROM "space"
      WHERE "settings" ->> 'layout' IS NULL
    `);
    const spacesToBackfill = parseInt(beforeRows[0]?.count ?? '0', 10);
    console.log(
      `[Migration] AddLayoutSettingsToSpace: ${spacesToBackfill} space(s) require layout backfill`
    );

    // Backfill: set layout.calloutDescriptionDisplayMode = 'expanded' for all
    // existing spaces that do not yet have a layout key, preserving current
    // behaviour (expanded) and ensuring the non-null resolver contract holds.
    await queryRunner.query(`
      UPDATE "space"
      SET "settings" = jsonb_set("settings", '{layout}', '{"calloutDescriptionDisplayMode": "expanded"}')
      WHERE "settings" ->> 'layout' IS NULL
    `);

    console.log(
      `[Migration] AddLayoutSettingsToSpace: backfill UPDATE complete`
    );

    // Verification: assert zero spaces are still missing the layout key.
    const afterRows = await queryRunner.query(`
      SELECT COUNT(*) AS count FROM "space"
      WHERE "settings" ->> 'layout' IS NULL
    `);
    const remaining = parseInt(afterRows[0]?.count ?? '0', 10);
    if (remaining > 0) {
      console.warn(
        `[Migration] WARNING: AddLayoutSettingsToSpace: ${remaining} space(s) still missing layout after backfill — investigate before proceeding`
      );
    } else {
      console.log(
        `[Migration] AddLayoutSettingsToSpace: verification passed — 0 spaces missing layout`
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Rollback intentionally disabled: the layout key defaults to EXPANDED via
    // the GraphQL resolver fallback, so removing it would restore equivalent
    // behaviour without a data migration. Matches the precedent in
    // AddPinnedAndSortModeToSpace. Re-enable the block below only if the full
    // feature branch is being reverted and data hygiene requires it.
    //
    // await _queryRunner.query(`
    //   UPDATE "space"
    //   SET "settings" = "settings" - 'layout'
    //   WHERE "settings" ->> 'layout' IS NOT NULL
    // `);
    console.log(
      `[Migration] AddLayoutSettingsToSpace down(): rollback is a no-op — resolver fallback handles absent layout safely`
    );
  }
}
