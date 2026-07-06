import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills the new `communication.allowOtherUsersToContactViaEmail` consent
 * flag onto every existing `user_settings` row.
 *
 * The flag (introduced for the user-to-user messaging feature) defaults to
 * `false` — a User is not reachable by email unless they explicitly opt in.
 * Users created before the field existed have no value for it in the
 * `communication` JSONB, so this migration writes the default into every row
 * that lacks it. `COALESCE` keeps the `jsonb_set` idempotent — a row that
 * already carries the flag (e.g. a User created after the field shipped) is
 * left untouched.
 *
 * With this backfill (plus the `false` default seeded for new Users in
 * `UserService.getDefaultUserSettings`), every row holds a concrete boolean,
 * so the GraphQL `Boolean!` field resolves directly from the stored value —
 * no read-time coercion resolver is needed.
 */
export class BackfillUserSettingsAllowContactViaEmail1782282484485
  implements MigrationInterface
{
  name = 'BackfillUserSettingsAllowContactViaEmail1782282484485';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "user_settings"
      SET "communication" = jsonb_set(
        "communication",
        '{allowOtherUsersToContactViaEmail}',
        COALESCE(
          "communication" -> 'allowOtherUsersToContactViaEmail',
          'false'::jsonb
        ),
        true
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "user_settings"
      SET "communication" = "communication" #- '{allowOtherUsersToContactViaEmail}';
    `);
  }
}
