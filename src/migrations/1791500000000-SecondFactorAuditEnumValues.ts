import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The `authentication` audit category and the three outcomes of a support
 * reset of a member's second factor. `ALTER TYPE ... ADD VALUE IF NOT EXISTS`
 * only: no table DDL, existing rows unaffected.
 */
export class SecondFactorAuditEnumValues1791500000000
  implements MigrationInterface
{
  name = 'SecondFactorAuditEnumValues1791500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "platform_audit_category" ADD VALUE IF NOT EXISTS 'authentication'`
    );
    await queryRunner.query(
      `ALTER TYPE "platform_audit_outcome" ADD VALUE IF NOT EXISTS 'second_factor_reset_started'`
    );
    await queryRunner.query(
      `ALTER TYPE "platform_audit_outcome" ADD VALUE IF NOT EXISTS 'second_factor_reset_completed'`
    );
    await queryRunner.query(
      `ALTER TYPE "platform_audit_outcome" ADD VALUE IF NOT EXISTS 'second_factor_reset_failed'`
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres has no `ALTER TYPE ... DROP VALUE` without recreating the
    // type. Forward-only, matching every prior extension of these enums.
  }
}
