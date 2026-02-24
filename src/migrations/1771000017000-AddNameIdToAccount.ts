import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNameIdToAccount1771000017000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add nameID column to account table
    await queryRunner.query(
      `ALTER TABLE "account" ADD COLUMN "nameID" VARCHAR(128)`
    );

    // Generate unique nameIDs for existing Account entities
    // Uses first 8 characters of their existing UUID id prefixed with 'account-'
    await queryRunner.query(`
      UPDATE "account"
      SET "nameID" = 'account-' || SUBSTRING(id::text, 1, 8)
      WHERE "nameID" IS NULL
    `);

    // Make nameID NOT NULL
    await queryRunner.query(`
      ALTER TABLE "account" ALTER COLUMN "nameID" SET NOT NULL
    `);

    // Add unique constraint on nameID
    await queryRunner.query(`
      ALTER TABLE "account" ADD CONSTRAINT "UQ_account_nameID" UNIQUE ("nameID")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique constraint
    await queryRunner.query(`
      ALTER TABLE "account" DROP CONSTRAINT IF EXISTS "UQ_account_nameID"
    `);

    // Drop the nameID column
    await queryRunner.query(`
      ALTER TABLE "account" DROP COLUMN IF EXISTS "nameID"
    `);
  }
}
