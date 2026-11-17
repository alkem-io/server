import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the platform-promote flag to the three resources that can be listed
 * first on the platform-wide listings: `space` (every level),
 * `innovation_pack` and `virtual_contributor` (the CTI child table).
 *
 * Additive only: `NOT NULL DEFAULT false` covers every existing row, so there
 * is no backfill. No index — the flag is a leading boolean sort key over
 * tables of a few hundred to a few thousand rows, and `rowId` (the tiebreak)
 * is already unique. No enum change: promote changes are audited in the
 * existing `platform_resource` category with the existing
 * `configuration_changed` outcome. `IF NOT EXISTS` / `IF EXISTS` keep both
 * directions idempotent.
 *
 * Rollout: the flag is read and written through PLATFORM_PROMOTE_MANAGE, a
 * credential rule on the platform authorization policy. After deploying, run
 * once per environment, as a platform-operations-admin:
 *   mutation { authorizationPolicyResetOnPlatform { id } }
 * and verify with
 *   SELECT count(*) FROM authorization_policy
 *   WHERE "credentialRules"::text LIKE '%platform-promote-manage%';  -- 1
 * Until then every set attempt is refused and every read returns null; the
 * promoted-first ordering is live immediately (everything starts
 * non-promoted, so the order is unchanged). Never run
 * `authorizationPolicyResetAll` for this — only the platform policy changes.
 *
 * Rollback: `down` drops the three columns; the platform rule is inert
 * without them and is removed by the next platform authorization reset.
 */
export class AddPlatformPromote1791400000000 implements MigrationInterface {
  name = 'AddPlatformPromote1791400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "space" ADD COLUMN IF NOT EXISTS "promote" boolean NOT NULL DEFAULT false`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_pack" ADD COLUMN IF NOT EXISTS "promote" boolean NOT NULL DEFAULT false`
    );
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" ADD COLUMN IF NOT EXISTS "promote" boolean NOT NULL DEFAULT false`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "virtual_contributor" DROP COLUMN IF EXISTS "promote"`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_pack" DROP COLUMN IF EXISTS "promote"`
    );
    await queryRunner.query(
      `ALTER TABLE "space" DROP COLUMN IF EXISTS "promote"`
    );
  }
}
