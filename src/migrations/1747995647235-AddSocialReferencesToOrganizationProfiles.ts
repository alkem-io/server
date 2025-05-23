import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class AddSocialReferencesToOrganizationProfiles1747995647235
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Define the new references
    const referencesToAdd = [
      { name: 'bsky', description: 'Organization profile on BlueSky', uri: '' },
      {
        name: 'github',
        description: 'Organization profile on GitHub',
        uri: '',
      },
      {
        name: 'linkedin',
        description: 'Organization profile on LinkedIn',
        uri: '',
      },
    ];

    // Fetch all organization profiles
    const organizationProfiles = await queryRunner.query(`
      SELECT o.id AS organizationId, p.id AS profileId
      FROM organization o
      INNER JOIN profile p ON o.profileId = p.id
    `);

    // Iterate through each organization profile
    for (const org of organizationProfiles) {
      const existingReferences = await queryRunner.query(
        `
        SELECT name
        FROM reference
        WHERE profileId = ?
      `,
        [org.profileId]
      );

      // Add missing references
      for (const ref of referencesToAdd) {
        const hasReference = existingReferences.some(
          (existingRef: any) => existingRef.name === ref.name
        );

        if (!hasReference) {
          await queryRunner.query(
            `
            INSERT INTO reference (id, profileId, version, name, description, uri, createdDate, updatedDate)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
          `,
            [
              randomUUID(), // Generate a random UUID for the reference ID
              org.profileId,
              '1', // Version
              ref.name,
              ref.description,
              ref.uri,
            ]
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the added references ('bsky', 'github', 'linkedin') from all organization profiles
    await queryRunner.query(`
      DELETE FROM reference
      WHERE name IN ('bsky', 'github', 'linkedin')
    `);
  }
}
