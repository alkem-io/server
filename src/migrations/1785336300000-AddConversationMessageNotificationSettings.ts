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
 *    existing key, safely re-runnable.
 *  - `down`: removes exactly the two keys via the `#-` operator.
 *
 * Ships in the SAME PR as the settings-interface fields (T006) — the
 * settings surface must never observe a missing row (US3-AS2/SC-005).
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
          notification,
          '{user,${key}}'::text[],
          $1::jsonb
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
