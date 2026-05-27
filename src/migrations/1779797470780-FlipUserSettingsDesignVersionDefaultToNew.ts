import { MigrationInterface, QueryRunner } from 'typeorm';

export class FlipUserSettingsDesignVersionDefaultToNew1779797470780
  implements MigrationInterface
{
  name = 'FlipUserSettingsDesignVersionDefaultToNew1779797470780';

  // Phase 2 (2026-05-26) — flip new-insert default from 1 to 2.
  // Column-default DDL only: no UPDATE, so existing rows preserve their
  // current designVersion (whether the Phase-1 default-applied 1, an explicit
  // user choice, or any other integer per FR-004). Only future inserts that
  // omit the column are affected. Idempotent — safe to re-apply.
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_settings" ALTER COLUMN "designVersion" SET DEFAULT 2`
    );
  }

  // Rollback restores the Phase-1 column default of 1 for new inserts.
  // Existing rows are NOT modified by this revert (no UPDATE statement) —
  // the same preserved-choice invariant as `up()`. Idempotent.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_settings" ALTER COLUMN "designVersion" SET DEFAULT 1`
    );
  }
}
