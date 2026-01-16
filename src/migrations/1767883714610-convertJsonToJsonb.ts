import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertJsonToJsonb1767883714610 implements MigrationInterface {
  // All JSON columns to be converted to JSONB for better performance and indexing
  private readonly jsonColumns: { table: string; column: string }[] = [
    { table: 'account', column: 'baselineLicensePlan' },
    { table: 'ai_persona', column: 'promptGraph' },
    { table: 'authorization_policy', column: 'credentialRules' },
    { table: 'authorization_policy', column: 'privilegeRules' },
    { table: 'callout', column: 'settings' },
    { table: 'in_app_notification', column: 'payload' },
    { table: 'innovation_flow', column: 'settings' },
    { table: 'innovation_flow_state', column: 'settings' },
    { table: 'license_policy', column: 'credentialRules' },
    { table: 'location', column: 'geoLocation' },
    { table: 'organization', column: 'settings' },
    { table: 'platform', column: 'settings' },
    { table: 'platform', column: 'wellKnownVirtualContributors' },
    { table: 'role', column: 'credential' },
    { table: 'role', column: 'organizationPolicy' },
    { table: 'role', column: 'parentCredentials' },
    { table: 'role', column: 'userPolicy' },
    { table: 'role', column: 'virtualContributorPolicy' },
    { table: 'space', column: 'platformRolesAccess' },
    { table: 'space', column: 'settings' },
    { table: 'template_content_space', column: 'settings' },
    { table: 'user_settings', column: 'communication' },
    { table: 'user_settings', column: 'notification' },
    { table: 'user_settings', column: 'privacy' },
    { table: 'virtual_contributor', column: 'platformSettings' },
    { table: 'virtual_contributor', column: 'promptGraphDefinition' },
    { table: 'virtual_contributor', column: 'settings' },
    { table: 'whiteboard', column: 'previewSettings' },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { table, column } of this.jsonColumns) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE jsonb USING "${column}"::jsonb`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { table, column } of this.jsonColumns) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE json USING "${column}"::json`
      );
    }
  }
}
