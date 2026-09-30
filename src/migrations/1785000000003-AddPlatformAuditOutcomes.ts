import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * workspace#027-platform-role-redesign (T017): extends `platform_audit_outcome`
 * with the additive outcome values the four new categories need
 * (data-model.md §6). `role_grant_rejected` is shared by two write paths — a
 * rejected role assignment (FR-018) and a rejected A21 service-profile
 * attempt (eighth clarification pass) — deliberately no separate value for
 * the latter.
 */
export class AddPlatformAuditOutcomes1785000000003
  implements MigrationInterface
{
  name = 'AddPlatformAuditOutcomes1785000000003';

  private static readonly NEW_VALUES = [
    'role_granted',
    'role_revoked',
    'role_grant_rejected',
    'service_profile_changed',
    'configuration_changed',
    'resource_moved',
    'resource_deleted',
    'visibility_changed',
    'license_assigned',
    'license_revoked',
    'identity_deleted',
    'account_reset',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const value of AddPlatformAuditOutcomes1785000000003.NEW_VALUES) {
      await queryRunner.query(
        `ALTER TYPE "platform_audit_outcome" ADD VALUE IF NOT EXISTS '${value}'`
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres has no `ALTER TYPE ... DROP VALUE` without recreating the
    // type. Forward-only, matching every prior extension of this enum.
  }
}
