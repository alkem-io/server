import { MigrationInterface, QueryRunner } from 'typeorm';

// Additive, reversible. Adds a single nullable relation from a callout
// contribution to a Classification, used to carry the column of a task on a
// Tasks board. No data rewrite in either direction: existing rows keep a NULL
// classificationId, and down() drops the FK, the UNIQUE constraint, and the
// column with no backfill. ON DELETE SET NULL keeps a contribution row valid if
// its classification is removed rather than cascading the delete up.
export class TaskBoardContributionClassification1787315924637
  implements MigrationInterface
{
  name = 'TaskBoardContributionClassification1787315924637';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "callout_contribution" ADD "classificationId" uuid`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_contribution" ADD CONSTRAINT "UQ_c8dcb5c0d8ec78f673d1b0376d5" UNIQUE ("classificationId")`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_contribution" ADD CONSTRAINT "FK_c8dcb5c0d8ec78f673d1b0376d5" FOREIGN KEY ("classificationId") REFERENCES "classification"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order of up(): drop FK before UNIQUE before the column.
    await queryRunner.query(
      `ALTER TABLE "callout_contribution" DROP CONSTRAINT "FK_c8dcb5c0d8ec78f673d1b0376d5"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_contribution" DROP CONSTRAINT "UQ_c8dcb5c0d8ec78f673d1b0376d5"`
    );
    await queryRunner.query(
      `ALTER TABLE "callout_contribution" DROP COLUMN "classificationId"`
    );
  }
}
