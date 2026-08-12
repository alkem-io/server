import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * workspace#027-platform-role-redesign (T016): extends `platform_audit_category`
 * with the four new categories this feature's audit writers use
 * (data-model.md §6): role-assignment, user-record, configuration, resource.
 *
 * `ALTER TYPE ... ADD VALUE IF NOT EXISTS` — the established non-breaking,
 * additive pattern (`1784818900000-AddPlatformOperationsAuditCategory`); no
 * table DDL, existing rows unaffected.
 */
export class AddPlatformAuditCategories1785000000002
  implements MigrationInterface
{
  name = 'AddPlatformAuditCategories1785000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "platform_audit_category" ADD VALUE IF NOT EXISTS 'platform_role_assignment'`
    );
    await queryRunner.query(
      `ALTER TYPE "platform_audit_category" ADD VALUE IF NOT EXISTS 'platform_user_record'`
    );
    await queryRunner.query(
      `ALTER TYPE "platform_audit_category" ADD VALUE IF NOT EXISTS 'platform_configuration'`
    );
    await queryRunner.query(
      `ALTER TYPE "platform_audit_category" ADD VALUE IF NOT EXISTS 'platform_resource'`
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres has no `ALTER TYPE ... DROP VALUE` without recreating the
    // type. Forward-only, matching every prior extension of this enum.
  }
}
