import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 034-messaging-notifications (contract C-5, FR-002/FR-004).
 *
 * Backfills the two new messaging-notification settings rows
 * (`conversationMessageDirect` / `conversationMessageGroup`) onto every
 * existing `user_settings` row, at the mandated defaults
 * `{ email: false, inApp: false, push: true }` (FR-002). Modelled on
 * `1772396107070-AddPushFieldToNotificationSettings`:
 *
 *  - `up`: additive-only `jsonb_set` per key, guarded by
 *    `WHERE notification -> 'user' -> '<key>' IS NULL` — never touches an
 *    existing key, safely re-runnable. The inner `jsonb_set` additionally
 *    materializes `notification.user` itself (`COALESCE(...,'{}'::jsonb)`)
 *    before writing the leaf key, so a row whose `user` object is entirely
 *    absent still gets healed (corr-server-3) — a bare `jsonb_set` on a
 *    non-existent parent path is a silent no-op otherwise.
 *  - `down`: removes exactly the two keys via the `#-` operator.
 *
 * Ships in the SAME PR as the settings-interface fields (T006) — the
 * settings surface must never observe a missing row (US3-AS2/SC-005).
 * Belt-and-braces: this migration is a one-shot backfill, so it cannot heal
 * a `user_settings` row inserted by an old pod during a rolling deploy
 * *after* it has already run. `UserSettings.applyConversationMessageNotificationDefaults`
 * (`@AfterLoad`, user.settings.entity.ts) and the recipients-service default
 * (notification.recipients.service.ts) are the read-side backstop for that
 * race (corr-server-3).
 */
export class AddConversationMessageNotificationSettings1785336300000
  implements MigrationInterface
{
  private static readonly DEFAULT_VALUE = JSON.stringify({
    email: false,
    inApp: false,
    push: true,
  });

  private static readonly KEYS = [
    'conversationMessageDirect',
    'conversationMessageGroup',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const key of AddConversationMessageNotificationSettings1785336300000.KEYS) {
      await queryRunner.query(
        `
        UPDATE user_settings
        SET notification = jsonb_set(
          jsonb_set(
            notification,
            '{user}'::text[],
            COALESCE(notification -> 'user', '{}'::jsonb),
            true
          ),
          '{user,${key}}'::text[],
          $1::jsonb,
          true
        )
        WHERE notification -> 'user' -> '${key}' IS NULL
        `,
        [AddConversationMessageNotificationSettings1785336300000.DEFAULT_VALUE]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const key of AddConversationMessageNotificationSettings1785336300000.KEYS) {
      await queryRunner.query(`
        UPDATE user_settings
        SET notification = notification #- '{user,${key}}'::text[]
        WHERE notification -> 'user' -> '${key}' IS NOT NULL
      `);
    }
  }
}
