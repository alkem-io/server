import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePlatformSpaceTemplate1753780215298
  implements MigrationInterface
{
  name = 'UpdatePlatformSpaceTemplate1753780215298';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Starting migration to update platform space templates...');

    // Get template defaults with PLATFORM_SPACE type
    const templateDefaults = await queryRunner.query(
      `SELECT td.id, td.type, t.id as templateId, t.contentSpaceId
       FROM template_default td
       JOIN template t ON td.templateId = t.id
       WHERE td.type = 'platform-space'`
    );

    if (templateDefaults.length === 0) {
      console.log('No platform-space template defaults found.');
      return;
    }

    console.log(
      `Found ${templateDefaults.length} platform-space template defaults to update.`
    );

    for (const templateDefault of templateDefaults) {
      console.log(`Updating template default with ID: ${templateDefault.id}`);

      if (!templateDefault.contentSpaceId) {
        console.log(
          `Template ${templateDefault.templateId} has no contentSpaceId, skipping...`
        );
        continue;
      }

      // Get the current settings for the template content space
      const [templateContentSpace] = await queryRunner.query(
        `SELECT id, settings FROM template_content_space WHERE id = ?`,
        [templateDefault.contentSpaceId]
      );

      if (!templateContentSpace) {
        console.log(
          `No template content space found for ID: ${templateDefault.contentSpaceId}, skipping...`
        );
        continue;
      }

      try {
        // Safely parse current settings
        let settings;

        if (typeof templateContentSpace.settings === 'string') {
          settings = JSON.parse(templateContentSpace.settings);
        } else if (typeof templateContentSpace.settings === 'object') {
          settings = templateContentSpace.settings;
        } else {
          // Create default settings if parsing fails
          console.log(
            `Invalid settings for template content space ID: ${templateDefault.contentSpaceId}, creating default settings...`
          );
          settings = {};
        }

        // Update the collaboration settings
        settings.collaboration = {
          ...(settings.collaboration || {}),
          inheritMembershipRights: false,
          allowMembersToCreateSubspaces: false,
          allowMembersToCreateCallouts: false,
          allowEventsFromSubspaces: true,
        };

        settings.privacy = {
          ...(settings.privacy || {}),
          mode: 'private',
          allowPlatformSupportAsAdmin: false,
        };

        settings.membership = {
          ...(settings.membership || {}),
          policy: 'applications',
          trustedOrganizations: settings.membership?.trustedOrganizations || [],
          allowSubspaceAdminsToInviteMembers: true,
        };

        // Convert settings object to JSON string
        const settingsJson = JSON.stringify(settings);

        // Update the template content space with the new settings
        await queryRunner.query(
          `UPDATE template_content_space SET settings = ? WHERE id = ?`,
          [settingsJson, templateDefault.contentSpaceId]
        );

        console.log(
          `Successfully updated settings for template content space: ${templateDefault.contentSpaceId}`
        );
      } catch (error) {
        console.error(
          `Error processing template content space ID: ${templateDefault.contentSpaceId}`,
          error
        );
      }
    }

    console.log('Migration completed successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
