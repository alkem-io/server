import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * workspace#027-platform-role-redesign (T018, FR-025): extends
 * `platform_audit_initiator_role` with the ten real platform roles so
 * attribution can name the actual authorizing role instead of the coarse
 * legacy tiers. The legacy `self` / `platform_admin` / `system` / `service`
 * values stay valid.
 *
 * Exactly TEN values — the FR-025 carve-out (eighth clarification pass) adds
 * NONE: the two authorizations that hold no owning platform role reuse the
 * existing coarse tiers — `platform_admin` for a legacy-broad-grant
 * authorization, `system` for a bootstrap-seeded write (T058a). No
 * `legacy_broad_grant` value: it would name what `platform_admin` already
 * names, in a vocabulary Slice B is trying to shrink.
 */
export class ExtendPlatformAuditInitiatorRole1785000000004
  implements MigrationInterface
{
  name = 'ExtendPlatformAuditInitiatorRole1785000000004';

  private static readonly NEW_VALUES = [
    'platform_roles_admin',
    'platform_content_full_access',
    'platform_resource_admin',
    'platform_settings_admin',
    'platform_operations_admin',
    'platform_users_admin',
    'platform_support',
    'platform_license_manager',
    'platform_spaces_reader',
    'platform_audit_reader',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const value of ExtendPlatformAuditInitiatorRole1785000000004.NEW_VALUES) {
      await queryRunner.query(
        `ALTER TYPE "platform_audit_initiator_role" ADD VALUE IF NOT EXISTS '${value}'`
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres has no `ALTER TYPE ... DROP VALUE` without recreating the
    // type. Forward-only, matching every prior extension of this enum.
  }
}
