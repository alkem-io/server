import { MigrationInterface, QueryRunner } from 'typeorm';

export class MergeRoomVcDataColumns1771000015000 implements MigrationInterface {
  name = 'MergeRoomVcDataColumns1771000015000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add new vcData column
    await queryRunner.query(`
      ALTER TABLE room
      ADD COLUMN IF NOT EXISTS "vcData" jsonb DEFAULT '{}'::jsonb
    `);

    // Step 2: Migrate data from vcInteractionsByThread into vcData
    await queryRunner.query(`
      UPDATE room
      SET "vcData" = jsonb_build_object(
        'interactionsByThread', COALESCE("vcInteractionsByThread", '{}'::jsonb)
      )
      WHERE "vcInteractionsByThread" IS NOT NULL
    `);

    // Step 3: Drop old column
    await queryRunner.query(`
      ALTER TABLE room DROP COLUMN IF EXISTS "vcInteractionsByThread"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Re-add old column
    await queryRunner.query(`
      ALTER TABLE room
      ADD COLUMN IF NOT EXISTS "vcInteractionsByThread" jsonb DEFAULT NULL
    `);

    // Step 2: Migrate data back from vcData
    await queryRunner.query(`
      UPDATE room
      SET "vcInteractionsByThread" = "vcData"->'interactionsByThread'
      WHERE "vcData" IS NOT NULL AND "vcData" != '{}'::jsonb
    `);

    // Step 3: Drop vcData column
    await queryRunner.query(`
      ALTER TABLE room DROP COLUMN IF EXISTS "vcData"
    `);
  }
}
