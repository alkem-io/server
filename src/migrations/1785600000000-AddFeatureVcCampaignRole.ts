import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { NEW_PLATFORM_ROLE_SEED_DEFINITIONS } from './utils/platform.role.seed.definitions';

const FEATURE_VC_CAMPAIGN = 'feature-vc-campaign';

/**
 * workspace#027-platform-role-redesign (Slice A, additive) — registers the
 * fourth `Feature …` role, `feature-vc-campaign`, on the existing platform
 * RoleSet. It is the successor of the legacy `platform-vc-campaign`, which
 * the audit had recorded as inert: server-side it grants no privilege, but
 * the client gates the dashboard Virtual Contributor offer on it, so it is
 * the targeting half of that offer (legacy-role-migration-runbook §2b).
 *
 * Same shape as `1784999999999-AddPlatformRolesRedesign`: fresh bootstraps
 * seed the row from the shared definitions module; this migration covers
 * already-bootstrapped databases, idempotently (skip-if-present). The legacy
 * row is untouched — Slice A never removes, and FR-012 forbids migrating
 * holders automatically; the runbook re-grants them.
 */
export class AddFeatureVcCampaignRole1785600000000
  implements MigrationInterface
{
  name = 'AddFeatureVcCampaignRole1785600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const def = NEW_PLATFORM_ROLE_SEED_DEFINITIONS.find(
      d => d.name === FEATURE_VC_CAMPAIGN
    );
    if (!def) {
      throw new Error(
        `Seed definition for ${FEATURE_VC_CAMPAIGN} is missing from NEW_PLATFORM_ROLE_SEED_DEFINITIONS`
      );
    }

    const platformRows: { roleSetId: string | null }[] =
      await queryRunner.query(
        `SELECT "roleSetId" FROM "platform" ORDER BY "createdDate" ASC LIMIT 1`
      );
    const roleSetId = platformRows?.[0]?.roleSetId;
    if (!roleSetId) {
      return;
    }

    const existing: { count: string }[] = await queryRunner.query(
      `SELECT COUNT(*) as count FROM "role" WHERE "roleSetId" = $1 AND name = $2`,
      [roleSetId, def.name]
    );
    if (Number(existing?.[0]?.count ?? 0) > 0) {
      return;
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    const platformRows: { roleSetId: string | null }[] =
      await queryRunner.query(
        `SELECT "roleSetId" FROM "platform" ORDER BY "createdDate" ASC LIMIT 1`
      );
    const roleSetId = platformRows?.[0]?.roleSetId;
    if (!roleSetId) {
      return;
    }
    await queryRunner.query(
      `DELETE FROM "role" WHERE "roleSetId" = $1 AND name = $2`,
      [roleSetId, FEATURE_VC_CAMPAIGN]
    );
    // The credential type string is unique to this role; a leftover
    // credential would keep the dashboard offer targeted after rollback.
    await queryRunner.query(`DELETE FROM "credential" WHERE "type" = $1`, [
      FEATURE_VC_CAMPAIGN,
    ]);
  }
}
