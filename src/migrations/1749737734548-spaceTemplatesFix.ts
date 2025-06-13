import { MigrationInterface, QueryRunner } from 'typeorm';

export class SpaceTemplatesFix1749737734548 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Select template id, template profile displayName, and contentSpace's about profile id
    const templates: {
      id: string;
      templateProfileDisplayName: string | null;
      templateContentSpaceAboutProfileId: string | null;
    }[] = await queryRunner.query(
      `SELECT t.id,
                p.displayName as templateProfileDisplayName,
                about.profileId as templateContentSpaceAboutProfileId
         FROM \`template\` t
         LEFT JOIN profile p ON t.profileId = p.id
         LEFT JOIN template_content_space cs ON t.contentSpaceId = cs.id
         LEFT JOIN space_about about ON cs.aboutId = about.id
         WHERE t.type = 'space'`
    );
    for (const template of templates) {
      // Get the displayName to use for the new space content about
      if (
        !template.templateContentSpaceAboutProfileId ||
        !template.templateProfileDisplayName
      ) {
        const msg = `Template ${template.id} is missing required fields: templateContentSpaceAboutProfileId or templateProfileDisplayName`;
        console.error(`${msg}`);
        throw new Error(`${msg}`);
      }

      // Update the content space about profile with the new displayName and description
      await queryRunner.query(
        `UPDATE profile SET type = ?, displayName = ?, description = ? WHERE id = ?`,
        [
          'space-about',
          template.templateProfileDisplayName,
          '',
          template.templateContentSpaceAboutProfileId,
        ]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
