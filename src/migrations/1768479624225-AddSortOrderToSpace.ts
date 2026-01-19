import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSortOrderToSpace1768479624225 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add sortOrder column with default value of 0
    await queryRunner.query(
      `ALTER TABLE "space" ADD "sortOrder" integer NOT NULL DEFAULT 0`
    );

    // Set initial sortOrder values for existing subspaces based on creation order
    // Each subspace within a parent gets sequential sortOrder starting from 1
    await queryRunner.query(`
      WITH ranked_subspaces AS (
        SELECT
          id,
          "parentSpaceId",
          ROW_NUMBER() OVER (
            PARTITION BY "parentSpaceId"
            ORDER BY "createdDate" ASC
          ) as rn
        FROM space
        WHERE "parentSpaceId" IS NOT NULL
      )
      UPDATE space
      SET "sortOrder" = ranked_subspaces.rn
      FROM ranked_subspaces
      WHERE space.id = ranked_subspaces.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "space" DROP COLUMN "sortOrder"`);
  }
}
