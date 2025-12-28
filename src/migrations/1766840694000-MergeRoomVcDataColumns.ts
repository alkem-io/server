import { MigrationInterface, QueryRunner } from 'typeorm';

export class MergeRoomVcDataColumns1766840694000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add new vcData column if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE room
      ADD COLUMN IF NOT EXISTS "vcData" jsonb DEFAULT '{}'::jsonb
    `);

    // Step 2: Migrate data from old columns into vcData
    // Combine vcInteractionsByThread and language into the new vcData structure
    await queryRunner.query(`
      UPDATE room
      SET "vcData" = jsonb_build_object(
        'language', COALESCE(language, NULL),
        'interactionsByThread', COALESCE("vcInteractionsByThread", '{}'::jsonb)
      )
      WHERE "vcInteractionsByThread" IS NOT NULL OR language IS NOT NULL
    `);

    // Step 3: Drop old columns
    await queryRunner.query(`
      ALTER TABLE room DROP COLUMN IF EXISTS "vcInteractionsByThread"
    `);
    await queryRunner.query(`
      ALTER TABLE room DROP COLUMN IF EXISTS language
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Re-add old columns
    await queryRunner.query(`
      ALTER TABLE room
      ADD COLUMN IF NOT EXISTS "vcInteractionsByThread" jsonb DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS language VARCHAR(255) DEFAULT NULL
    `);

    // Step 2: Migrate data back from vcData to old columns
    await queryRunner.query(`
      UPDATE room
      SET
        "vcInteractionsByThread" = "vcData"->'interactionsByThread',
        language = "vcData"->>'language'
      WHERE "vcData" IS NOT NULL
    `);

    // Step 3: Drop vcData column
    await queryRunner.query(`
      ALTER TABLE room DROP COLUMN IF EXISTS "vcData"
    `);
  }
}
