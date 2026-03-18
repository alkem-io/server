import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameAccountTypeColumnForCti1771000023000
  implements MigrationInterface
{
  name = 'RenameAccountTypeColumnForCti1771000023000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename the 'type' column on the account table to 'account_type'
    // to avoid confusion with the CTI discriminator column 'actor.type'.
    // Both columns are on different tables but share the same name, which
    // can cause aliasing issues in CTI JOIN queries.
    await queryRunner.query(
      `ALTER TABLE "account" RENAME COLUMN "type" TO "account_type"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "account" RENAME COLUMN "account_type" TO "type"`
    );
  }
}
