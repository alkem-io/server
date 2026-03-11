import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPinnedAndSortModeToSpace1771100000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "space" ADD "pinned" boolean NOT NULL DEFAULT false`
    );

    await queryRunner.query(`
      UPDATE "space"
      SET "settings" = jsonb_set("settings", '{sortMode}', '"alphabetical"')
      WHERE "settings" ->> 'sortMode' IS NULL
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Rollback intentionally disabled: removing pinned column and sortMode
    // would cause data loss. These fields are additive and safe to leave in place.
    // await queryRunner.query(`ALTER TABLE "space" DROP COLUMN "pinned"`);
    // await queryRunner.query(
    //   `UPDATE "space" SET "settings" = "settings" - 'sortMode'`
    // );
  }
}
