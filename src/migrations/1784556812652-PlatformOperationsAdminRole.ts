import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

/**
 * workspace#019 (Platform Operations Admin): registers the
 * `platform-operations-admin` role on the existing
 * platform RoleSet so the EXISTING `assignPlatformRoleToUser` /
 * `removePlatformRoleFromUser` mutations can grant / revoke the
 * `platform-operations-admin` credential per user. Holders are granted the
 * dedicated AUTHORIZATION_RESET and PLATFORM_OPERATIONS_ADMIN privileges by the
 * credential rules in the *.service.authorization.ts files (applied on
 * authorization-policy reset; no data migration for the rules themselves — run
 * one authorization reset post-deploy).
 *
 * Fresh bootstraps seed this role via the seed migration's createPlatformRoles;
 * this migration covers already-bootstrapped databases (same split as
 * 1780600000000-PlatformAssistantAccessRole). Idempotent: it inserts only when
 * the role is absent from the platform RoleSet.
 */
export class PlatformOperationsAdminRole1784556812652
  implements MigrationInterface
{
  name = 'PlatformOperationsAdminRole1784556812652';

  private readonly roleName = 'platform-operations-admin';
  private readonly credential = {
    type: 'platform-operations-admin',
    resourceID: '',
  };
  private readonly userPolicy = { minimum: 0, maximum: -1 };

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Resolve the platform RoleSet id (the platform row carries roleSetId).
    const platformRows: { roleSetId: string | null }[] =
      await queryRunner.query(`SELECT "roleSetId" FROM "platform" LIMIT 1`);
    const roleSetId = platformRows?.[0]?.roleSetId;
    if (!roleSetId) {
      // No platform RoleSet (e.g. a not-yet-bootstrapped DB) — nothing to do;
      // the seed migration will create the role on bootstrap.
      return;
    }

    // Idempotency: skip when the role already exists on this RoleSet.
    const existing: { count: string }[] = await queryRunner.query(
      `SELECT COUNT(*) as count FROM "role" WHERE "roleSetId" = $1 AND name = $2`,
      [roleSetId, this.roleName]
    );
    if (Number(existing?.[0]?.count ?? 0) > 0) {
      return;
    }

    await queryRunner.query(
      `INSERT INTO "role" (id, "createdDate", "updatedDate", version, "roleSetId", name, credential, "parentCredentials", "requiresEntryRole", "requiresSameRoleInParentRoleSet", "userPolicy", "organizationPolicy", "virtualContributorPolicy")
       VALUES ($1, NOW(), NOW(), 1, $2, $3, $4, '[]', false, false, $5, '{"minimum": 0, "maximum": 0}', '{"minimum": 0, "maximum": 0}')`,
      [
        randomUUID(),
        roleSetId,
        this.roleName,
        JSON.stringify(this.credential),
        JSON.stringify(this.userPolicy),
      ]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const platformRows: { roleSetId: string | null }[] =
      await queryRunner.query(`SELECT "roleSetId" FROM "platform" LIMIT 1`);
    const roleSetId = platformRows?.[0]?.roleSetId;
    if (!roleSetId) {
      return;
    }
    await queryRunner.query(
      `DELETE FROM "role" WHERE "roleSetId" = $1 AND name = $2`,
      [roleSetId, this.roleName]
    );
  }
}
