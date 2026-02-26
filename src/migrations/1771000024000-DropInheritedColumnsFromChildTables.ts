import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DropInheritedColumnsFromChildTables1771000024000
  implements MigrationInterface
{
  name = 'DropInheritedColumnsFromChildTables1771000024000';

  private readonly childTables = [
    'user',
    'organization',
    'virtual_contributor',
    'space',
    'account',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Move createdDate, updatedDate, version from child tables to actor.
    // The actor rows were created with DEFAULT now(), so the real timestamps
    // are still on the child tables. Copy them over before dropping.
    for (const table of this.childTables) {
      await queryRunner.query(
        `UPDATE "actor" SET
           "createdDate" = "${table}"."createdDate",
           "updatedDate" = "${table}"."updatedDate",
           "version" = "${table}"."version"
         FROM "${table}"
         WHERE "actor"."id" = "${table}"."id"`
      );
    }

    // Step 2: Drop the now-redundant columns from child tables.
    // The id column stays — it's the shared PK / FK to actor.
    for (const table of this.childTables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "createdDate"`
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "updatedDate"`
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "version"`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add columns to child tables
    for (const table of this.childTables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD "createdDate" TIMESTAMP NOT NULL DEFAULT now()`
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD "updatedDate" TIMESTAMP NOT NULL DEFAULT now()`
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD "version" integer NOT NULL DEFAULT 1`
      );
    }

    // Copy values back from actor table to child tables
    for (const table of this.childTables) {
      await queryRunner.query(
        `UPDATE "${table}" SET
           "createdDate" = "actor"."createdDate",
           "updatedDate" = "actor"."updatedDate",
           "version" = "actor"."version"
         FROM "actor" WHERE "${table}"."id" = "actor"."id"`
      );
    }
  }
}
