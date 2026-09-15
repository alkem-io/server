import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills the three new organisation-side associate notification rows
 * (`adminAssociateInvitationResponse`, `adminAssociateApplicationReceived`,
 * `adminAssociateJoined`) onto every existing `user_settings` row, at the
 * mandated defaults `{ email: true, inApp: true, push: true }`. Cloned from
 * `AddOrganizationSpaceInvitationNotificationSettings` (1788500000000):
 *
 *  - `up`: three additive-only `jsonb_set`s, each independently guarded by
 *    `WHERE notification #> '{organization,<key>}' IS NULL` — never touches
 *    an existing key, safely re-runnable.
 *  - `down`: intentional no-op — see the note on the method.
 *
 * Belt-and-braces: `UserSettings.applyOrganizationAssociateDefaults`
 * (`@AfterLoad`) and the recipients-service
 * `DEFAULT_ORGANIZATION_ASSOCIATE_CHANNELS` fallback are the read-side
 * backstop for rows inserted by an old pod during a rolling deploy after
 * this migration has already run.
 */
export class AddOrganizationAssociateNotificationSettings1788900000000
  implements MigrationInterface
{
  private static readonly DEFAULT_VALUE = JSON.stringify({
    email: true,
    inApp: true,
    push: true,
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    const value =
      AddOrganizationAssociateNotificationSettings1788900000000.DEFAULT_VALUE;
    for (const key of [
      'adminAssociateInvitationResponse',
      'adminAssociateApplicationReceived',
      'adminAssociateJoined',
    ]) {
      await queryRunner.query(
        `
        UPDATE user_settings
        SET notification = jsonb_set(
          notification,
          ('{organization,' || $2 || '}')::text[],
          $1::jsonb,
          true
        )
        WHERE notification #> ('{organization,' || $2 || '}')::text[] IS NULL
        `,
        [value, key]
      );
    }
  }

  // No automatic rollback — same rationale as 1788500000000: stripping the
  // key is not the inverse of seeding it. The key is additive and inert to
  // older code, so leaving it costs nothing on a rollback.
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentional no-op. See note above.
  }
}
