import { MigrationInterface, QueryRunner } from 'typeorm';

const PLATFORM_SPACE_TUTORIALS = 'platform-space-tutorials'; // = enum at src/common/enums/template.default.type.ts

export class UpdateTutorialTemplate1747050057273 implements MigrationInterface {
  private findTemplateProfileId = async (
    queryRunner: QueryRunner
  ): Promise<string> => {
    const templateProfileIds: { id: string }[] = await queryRunner.query(`
      SELECT profile.id FROM template
        JOIN collaboration ON collaboration.id = template.collaborationId
        JOIN callout ON callout.calloutsSetId = collaboration.calloutsSetId
        JOIN callout_framing ON callout_framing.id = callout.framingId
        JOIN profile ON profile.id = callout_framing.profileId
      WHERE template.id IN (
        SELECT templateId FROM template_default WHERE templatesManagerId IN (
          SELECT templatesManagerId FROM platform
        ) AND template_default.type = '${PLATFORM_SPACE_TUTORIALS}'
      )
      AND profile.description LIKE 'Done with the tutorials and ready to%';
    `);
    if (templateProfileIds.length !== 1) {
      throw new Error(
        `Found ${templateProfileIds.length} templates to update, expected one.`
      );
    } else {
      return templateProfileIds[0].id;
    }
  };

  private updateDescription = async (
    queryRunner: QueryRunner,
    profileId: string,
    newDescription: string
  ) => {
    await queryRunner.query(
      `
      UPDATE profile SET description = ? WHERE id = ?;
    `,
      [newDescription, profileId]
    );
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Updates the text of certain callout in the platform template to create a space with tutorials
    const profileId = await this.findTemplateProfileId(queryRunner);
    await this.updateDescription(
      queryRunner,
      profileId,
      'Done with the tutorials and ready to build up this Space/Subspace your way? You can move the tutorials or delete them completely. \n\n*   To move in a Space:\n\n    *   Go to the settings using the ⚙️ icon on the top right of the space \n    *   Go to the LAYOUT tab \n    *   Drag the tool to the page you want\n\n* To move in a Subspace:\n\n    *   Go to the innovation flow and click on the icon to manage the flow \n    *   Drag the tool to the phase you want\n\n*   To remove:\n\n    *   Click on the ⚙️ icon on the block with the tutorial > Delete\n    *   Confirm \n\n You can always find the tutorials in the [tutorials template pack](https://alkem.io/innovation-packs/newspace) and in the [documentation](https://alkem.io/docs/how-to/tutorials.en-US).'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const profileId = await this.findTemplateProfileId(queryRunner);
    await this.updateDescription(
      queryRunner,
      profileId,
      "Done with the tutorials and ready to build up this Space your way? You can move the tutorials to your knowledge base or delete them completely.\n\n*   To move:\n\n    *   Click on the ⚙️ icon on the block with the tutorial > Edit\n    *   Scroll down to 'Location'\n    *   Select 'Knowledge Base' or any other page\n\n*   To remove:\n\n    *   Click on the ⚙️ icon on the block with the tutorial > Delete\n    *   Confirm"
    );
  }
}
