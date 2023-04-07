import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { escapeString } from './utils/escape-string';

export class discussionProfile1680869665419 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addProfileRelation(
      queryRunner,
      'FK_2d8a3ca181c3f0346817685d21d',
      'discussion'
    );

    const discussions: any[] = await queryRunner.query(
      `SELECT id, title, description from discussion`
    );
    for (const discussion of discussions) {
      await this.createProfileAndLink(
        queryRunner,
        'discussion',
        discussion.id,
        discussion.title,
        discussion.description
      );
    }

    await queryRunner.query('ALTER TABLE `discussion` DROP COLUMN `title`');
    await queryRunner.query(
      'ALTER TABLE `discussion` DROP COLUMN `description`'
    );

    // This field was added to the database with discussion1635271457885 but is not in the entity definition
    // Removing as a cleanup
    await queryRunner.query(
      'ALTER TABLE `discussion` DROP COLUMN `displayName`'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // await queryRunner.query(
    //   'ALTER TABLE `discussion` ADD `displayName` varchar(255) NULL'
    // );
    await queryRunner.query('ALTER TABLE `discussion` ADD `title` text NULL');
    await queryRunner.query(
      'ALTER TABLE `discussion` ADD `description` text NULL'
    );

    const discussions: any[] = await queryRunner.query(
      `SELECT id, profileId from discussion`
    );
    for (const discussion of discussions) {
      const { profileId, displayName, description, authorizationId } =
        await this.getProfile(queryRunner, discussion.profileId);

      await queryRunner.query(
        `UPDATE discussion SET
          description = '${escapeString(description)}',
          title = '${escapeString(displayName)}'
          WHERE (id = '${discussion.id}')`
      );

      await this.deleteProfile(queryRunner, profileId, authorizationId);
    }

    await this.removeProfileRelation(
      queryRunner,
      'FK_2d8a3ca181c3f0346817685d21d',
      'discussion'
    );
  }
  public async addProfileRelation(
    queryRunner: QueryRunner,
    fk: string,
    entityTable: string
  ): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`${entityTable}\` ADD \`profileId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`${entityTable}\` ADD CONSTRAINT \`${fk}\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async removeProfileRelation(
    queryRunner: QueryRunner,
    fk: string,
    entityTable: string
  ): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ${entityTable} DROP FOREIGN KEY ${fk}`
    );
    await queryRunner.query(`ALTER TABLE ${entityTable} DROP COLUMN profileId`);
  }

  private async createProfileAndLink(
    queryRunner: QueryRunner,
    entityTable: string,
    entityID: string,
    displayName: string,
    description: string
  ): Promise<string> {
    const newProfileID = randomUUID();
    const profileAuthID = randomUUID();

    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, anonymousReadAccess, privilegeRules) VALUES
        ('${profileAuthID}',
        1, '', '', 0, '')`
    );

    await queryRunner.query(
      `INSERT INTO profile (id, version, authorizationId, description, displayName, tagline)
            VALUES ('${newProfileID}',
                    '1',
                    '${profileAuthID}',
                    '${escapeString(description)}',
                    '${escapeString(displayName)}',
                    '')`
    );

    await queryRunner.query(
      `UPDATE \`${entityTable}\` SET profileId = '${newProfileID}' WHERE (id = '${entityID}')`
    );
    return newProfileID;
  }

  private async getProfile(
    queryRunner: QueryRunner,
    profileId: string
  ): Promise<{
    profileId: string;
    displayName: string;
    description: string;
    authorizationId: string;
  }> {
    const profiles: any[] = await queryRunner.query(
      `SELECT id, displayName, description, authorizationId from \`profile\` WHERE (id = '${profileId}')`
    );
    const profile = profiles[0];

    return {
      profileId: profile.id,
      displayName: profile.displayName,
      description: profile.description,
      authorizationId: profile.authorizationId,
    };
  }

  private async deleteProfile(
    queryRunner: QueryRunner,
    profileId: string,
    profileAuthId: string
  ): Promise<void> {
    await queryRunner.query(
      `DELETE FROM authorization_policy WHERE (id = '${profileAuthId}')`
    );
    await queryRunner.query(`DELETE FROM profile WHERE (id = '${profileId}')`);
  }
}

// up
// await queryRunner.query(`ALTER TABLE \`discussion\` ADD CONSTRAINT \`FK_2d8a3ca181c3f0346817685d21d\` FOREIGN KEY (\`profileId\`) REFERENCES \`profile\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);

// down
// await queryRunner.query(`ALTER TABLE \`discussion\` DROP FOREIGN KEY \`FK_2d8a3ca181c3f0346817685d21d\``);
