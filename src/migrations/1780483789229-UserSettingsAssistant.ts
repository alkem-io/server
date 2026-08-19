import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the per-user assistant-authority grant column to `user_settings`
 * (004-web-ai-assistant, FR-018). Existing rows are BACKFILLED with the
 * READ-ONLY default (all READ capabilities enabled, both write tools disabled),
 * mirroring `getDefaultUserSettings()` — so existing users gain the assistant
 * with content-changing capabilities OFF by default, and a future write
 * capability they have never enabled stays disabled (absence ⇒ disabled).
 *
 * The default mirrors the frozen v1 classification
 * (contracts/assistant-authority.md §1); if that map changes, update both the
 * resolver/defaults code and this backfill default together.
 */
export class UserSettingsAssistant1780483789229 implements MigrationInterface {
  name = 'UserSettingsAssistant1780483789229';

  // Read-only default grant (kept in sync with the frozen classification map).
  private readonly readOnlyDefault = {
    enabledCapabilities: [
      { capability: 'search_content', enabled: true },
      { capability: 'list_whiteboards', enabled: true },
      { capability: 'analyze_whiteboard', enabled: true },
      { capability: 'analyze_contributions', enabled: true },
      { capability: 'analyze_audit_log', enabled: true },
      { capability: 'community_activity_summary', enabled: true },
      { capability: 'navigate_templates', enabled: true },
      { capability: 'create_whiteboard', enabled: false },
      { capability: 'create_whiteboard_in_space', enabled: false },
      { capability: 'edit_whiteboard_elements', enabled: false },
      { capability: 'update_whiteboard_content', enabled: false },
    ],
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the column with an empty default (used for any NEW rows created
    // before the application seeds a richer default).
    await queryRunner.query(
      `ALTER TABLE "user_settings" ADD "assistant" jsonb NOT NULL DEFAULT '{"enabledCapabilities": []}'`
    );

    // Backfill existing rows with the read-only default grant.
    await queryRunner.query(
      `UPDATE "user_settings" SET "assistant" = $1::jsonb`,
      [JSON.stringify(this.readOnlyDefault)]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_settings" DROP COLUMN "assistant"`
    );
  }
}
