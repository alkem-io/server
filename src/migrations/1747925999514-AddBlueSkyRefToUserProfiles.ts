import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class AddBlueSkyRefToUserProfiles1747925999514 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
    // Define the new reference
    const bskyReference = {
      name: 'bsky',
      description: 'User profile on BlueSky',
      uri: '',
    };

    // Fetch all users and their profiles
    const usersWithProfiles = await queryRunner.query(`
      SELECT u.id AS userId, p.id AS profileId
      FROM user u
      INNER JOIN profile p ON u.profileId = p.id
    `);

    // Iterate through each user and check if the "bsky" reference exists
    for (const user of usersWithProfiles) {
      const existingReferences = await queryRunner.query(
        `
        SELECT name
        FROM reference
        WHERE profileId = ?
      `,
        [user.profileId]
      );

      // Check if the "bsky" reference already exists
      const hasBskyReference = existingReferences.some(
        (ref: any) => ref.name === bskyReference.name
      );

      // If "bsky" reference does not exist, add it
      if (!hasBskyReference) {
        await queryRunner.query(
          `
          INSERT INTO reference (id, profileId, version, name, description, uri, createdDate, updatedDate)
          VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
          [
            randomUUID(),
            user.profileId,
            '1',
            bskyReference.name,
            bskyReference.description,
            bskyReference.uri,
          ]
        );
      }
    }

    // Remove all "twitter" references where the URI is empty
    await queryRunner.query(`
      DELETE FROM reference
      WHERE name = 'twitter' AND (uri IS NULL OR uri = '')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the "bsky" reference from all profiles
    await queryRunner.query(`
      DELETE FROM reference
      WHERE name = 'bsky'
    `);
  }
}
