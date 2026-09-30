import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { NEW_PLATFORM_ROLE_SEED_DEFINITIONS } from './utils/platform.role.seed.definitions';

/**
 * workspace#027-platform-role-redesign (Slice A, T013): registers the twelve
 * target `Platform …` / `Feature …` roles on the existing platform RoleSet so
 * the existing `assignPlatformRoleToUser` / `removePlatformRoleFromUser`
 * mutations (and the new organization-target pair, T032a) can grant / revoke
 * them. Holders are granted their owning privileges by the credential rules
 * in the `*.service.authorization.ts` files (applied on authorization-policy
 * reset; no data migration for the rules themselves — run one authorization
 * reset post-deploy, per repos.yaml's Slice A human gate).
 *
 * Fresh bootstraps seed these roles via the seed migration's
 * `createPlatformRoles` (T012, same shared definitions module); this
 * migration covers already-bootstrapped databases, following the precedent
 * of `1784818834950-PlatformOperationsAdminRole`. Idempotent per-row
 * (skip-if-present) so a partially-applied prior run is safe to re-run.
 */
export class AddPlatformRolesRedesign1784999999999
  implements MigrationInterface
{
  name = 'AddPlatformRolesRedesign1784999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const platformRows: { roleSetId: string | null }[] =
      await queryRunner.query(
        `SELECT "roleSetId" FROM "platform" ORDER BY "createdDate" ASC LIMIT 1`
      );
    const roleSetId = platformRows?.[0]?.roleSetId;
    if (!roleSetId) {
      // No platform RoleSet (e.g. a not-yet-bootstrapped DB) — nothing to do;
      // the seed migration creates the roles on bootstrap.
      return;
    }

    for (const def of NEW_PLATFORM_ROLE_SEED_DEFINITIONS) {
      const existing: { count: string }[] = await queryRunner.query(
        `SELECT COUNT(*) as count FROM "role" WHERE "roleSetId" = $1 AND name = $2`,
        [roleSetId, def.name]
      );
      if (Number(existing?.[0]?.count ?? 0) > 0) {
        continue;
      }

      await queryRunner.query(
        `INSERT INTO "role" (id, "createdDate", "updatedDate", version, "roleSetId", name, credential, "parentCredentials", "requiresEntryRole", "requiresSameRoleInParentRoleSet", "userPolicy", "organizationPolicy", "virtualContributorPolicy")
         VALUES ($1, NOW(), NOW(), 1, $2, $3, $4, '[]', false, false, $5, $6, $7)`,
        [
          randomUUID(),
          roleSetId,
          def.name,
          JSON.stringify({ type: def.credentialType, resourceID: '' }),
          JSON.stringify(def.userPolicy),
          JSON.stringify(def.organizationPolicy),
          JSON.stringify(def.virtualContributorPolicy),
        ]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const platformRows: { roleSetId: string | null }[] =
      await queryRunner.query(
        `SELECT "roleSetId" FROM "platform" ORDER BY "createdDate" ASC LIMIT 1`
      );
    const roleSetId = platformRows?.[0]?.roleSetId;
    if (!roleSetId) {
      return;
    }
    for (const def of NEW_PLATFORM_ROLE_SEED_DEFINITIONS) {
      await queryRunner.query(
        `DELETE FROM "role" WHERE "roleSetId" = $1 AND name = $2`,
        [roleSetId, def.name]
      );
      // Revoke issued credentials too, mirroring PlatformOperationsAdminRole's
      // down(): the credential rules live in code, so a leftover credential
      // would keep granting the new privileges after rollback. `credential`
      // has no inbound FKs (only references `actor`), and each of these
      // twelve type strings is unique to this migration.
      await queryRunner.query(`DELETE FROM "credential" WHERE "type" = $1`, [
        def.credentialType,
      ]);
    }
  }
}
