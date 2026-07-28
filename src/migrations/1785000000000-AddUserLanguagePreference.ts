import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add user-language-preference columns.
 *
 * Safe schema-only migration — no row UPDATEs, no concrete language values written.
 * Existing rows read {language: NULL, languageOfferAnswered: false} after up();
 * the languageOfferAnswered column defaults to false so no backfill is needed.
 * A NULL language means the user has never chosen a language.
 * No authorization_policy writes, no authorizationPolicyResetAll, no jsonb touch.
 * Safe down(): drops all four columns (each is nullable or has a server-set default).
 *
 * Columns added:
 *   user_settings.language               varchar(16) NULL         — chosen interface language
 *   user_settings.languageOfferAnswered  boolean NOT NULL DEFAULT false — one-way latch
 *   invitation.suggestedLanguage         varchar(16) NULL         — inviter's suggested language
 *   platform_invitation.suggestedLanguage varchar(16) NULL        — inviter's suggested language
 */
export class AddUserLanguagePreference1785000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "language" varchar(16)`
    );
    await queryRunner.query(
      `ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "languageOfferAnswered" boolean NOT NULL DEFAULT false`
    );
    await queryRunner.query(
      `ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "suggestedLanguage" varchar(16)`
    );
    await queryRunner.query(
      `ALTER TABLE "platform_invitation" ADD COLUMN IF NOT EXISTS "suggestedLanguage" varchar(16)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "platform_invitation" DROP COLUMN IF EXISTS "suggestedLanguage"`
    );
    await queryRunner.query(
      `ALTER TABLE "invitation" DROP COLUMN IF EXISTS "suggestedLanguage"`
    );
    await queryRunner.query(
      `ALTER TABLE "user_settings" DROP COLUMN IF EXISTS "languageOfferAnswered"`
    );
    await queryRunner.query(
      `ALTER TABLE "user_settings" DROP COLUMN IF EXISTS "language"`
    );
  }
}
