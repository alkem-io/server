import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Strips the departed user's display name and email from the persisted
 * jsonb payload of every historical `PLATFORM_USER_PROFILE_REMOVED` in-app
 * notification row. Pairs with the GraphQL field removals on
 * `InAppNotificationPayloadPlatformUserProfileRemoved`: without this
 * backfill, rows written before the fix would still carry the departed
 * user's name and email in storage even though the API no longer exposes
 * either field.
 *
 * Idempotent: the `WHERE` clause only matches rows that still have either
 * key, so a re-run is a no-op.
 */
export class StripPiiFromProfileRemovedPayloads1788100000000
  implements MigrationInterface
{
  name = 'StripPiiFromProfileRemovedPayloads1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ count: before }] = await queryRunner.query(`
      SELECT COUNT(*) AS count FROM in_app_notification
      WHERE type = 'PLATFORM_ADMIN_USER_PROFILE_REMOVED'
        AND (payload ? 'userDisplayName' OR payload ? 'userEmail')
    `);
    console.log(
      `[Migration] StripPiiFromProfileRemovedPayloads: ${before} profile-removed notification(s) still carry userDisplayName/userEmail`
    );

    await queryRunner.query(`
      UPDATE in_app_notification
      SET payload = (payload - 'userDisplayName' - 'userEmail')
      WHERE type = 'PLATFORM_ADMIN_USER_PROFILE_REMOVED'
        AND (payload ? 'userDisplayName' OR payload ? 'userEmail')
    `);

    const [{ count: residual }] = await queryRunner.query(`
      SELECT COUNT(*) AS count FROM in_app_notification
      WHERE type = 'PLATFORM_ADMIN_USER_PROFILE_REMOVED'
        AND (payload ? 'userDisplayName' OR payload ? 'userEmail')
    `);
    if (Number(residual) > 0) {
      console.warn(
        `[Migration] WARNING StripPiiFromProfileRemovedPayloads: ${residual} row(s) still carry the stripped keys after backfill — investigate before proceeding`
      );
    } else {
      console.log(
        '[Migration] StripPiiFromProfileRemovedPayloads: verification passed — 0 profile-removed notifications still carry userDisplayName/userEmail'
      );
    }
  }

  // Intentional no-op — the stripped keys held personal data of a user who,
  // in every real case, has since been deleted; there is nothing correct to
  // restore them from, and re-writing them would resurrect the exact leak
  // this migration exists to close.
  public async down(_queryRunner: QueryRunner): Promise<void> {
    console.log(
      '[Migration] StripPiiFromProfileRemovedPayloads: down() is an intentional no-op — the stripped PII is not recoverable and must not be'
    );
    return;
  }
}
