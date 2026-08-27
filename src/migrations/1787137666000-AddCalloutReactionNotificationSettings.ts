import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 041-callout-reaction-notifications (FR-007, FR-009).
 *
 * Backfills the new callout-reaction notification settings row
 * (`collaborationCalloutReaction`) onto every existing `user_settings` row, at
 * the mandated defaults `{ email: false, inApp: true, push: true }` (FR-007).
 * Modelled on `1785336300000-AddConversationMessageNotificationSettings`:
 *
 *  - `up`: additive-only `jsonb_set` guarded by
 *    `WHERE notification #> '{space,collaborationCalloutReaction}' IS NULL` —
 *    never touches an existing key, safely re-runnable. The inner `jsonb_set`
 *    additionally materializes `notification.space` itself if absent.
 *  - `down`: removes the key via the `#-` operator.
 *
 * Ships in the same change as the settings-interface field. Belt-and-braces:
 * `UserSettings.applyCalloutReactionNotificationDefaults` (`@AfterLoad`) and
 * the recipients-service `DEFAULT_CALLOUT_REACTION_CHANNELS` fallback are the
 * read-side backstop for rows inserted by an old pod during a rolling deploy
 * after this migration has already run.
 */
export class AddCalloutReactionNotificationSettings1787137666000
  implements MigrationInterface
{
  private static readonly DEFAULT_VALUE = JSON.stringify({
    email: false,
    inApp: true,
    push: true,
  });

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE user_settings
      SET notification = jsonb_set(
        jsonb_set(
          notification,
          '{space}'::text[],
          COALESCE(notification -> 'space', '{}'::jsonb),
          true
        ),
        '{space,collaborationCalloutReaction}'::text[],
        $1::jsonb,
        true
      )
      WHERE notification #> '{space,collaborationCalloutReaction}' IS NULL
      `,
      [AddCalloutReactionNotificationSettings1787137666000.DEFAULT_VALUE]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE user_settings
      SET notification = notification #- '{space,collaborationCalloutReaction}'::text[]
      WHERE notification #> '{space,collaborationCalloutReaction}' IS NOT NULL
    `);
  }
}
