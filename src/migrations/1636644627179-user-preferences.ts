import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class userPreferences1636644627179 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`user_preference_definition\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`groupName\` varchar(128) NOT NULL, \`displayName\` varchar(128) NOT NULL, \`description\` varchar(255) NOT NULL, \`valueType\` varchar(16) NOT NULL, \`type\` varchar(128) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `CREATE TABLE \`user_preference\` (\`id\` char(36) NOT NULL, \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, \`value\` varchar(16) NOT NULL, \`authorizationId\` char(36) NULL, \`userPreferenceDefinitionId\` char(36) NULL, \`userId\` char(36) NULL, UNIQUE INDEX \`REL_49030bc57aa0f319cee7996fca\` (\`authorizationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_preference\` ADD CONSTRAINT \`FK_49030bc57aa0f319cee7996fca1\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_preference\` ADD CONSTRAINT \`FK_650fb4e564a8b4b4ac344270744\` FOREIGN KEY (\`userPreferenceDefinitionId\`) REFERENCES \`user_preference_definition\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_preference\` ADD CONSTRAINT \`FK_5b141fbd1fef95a0540f7e7d1e2\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    // populate some initial definitions
    await queryRunner.query(
      `INSERT INTO user_preference_definition (id, version, groupName, displayName, description, valueType, type)
      VALUES (UUID(), 1, 'Notification', 'Community Application', 'Receive notification when I apply to join a community', 'boolean', 'NotificationApplicationSubmitted')`
    );
    await queryRunner.query(
      `INSERT INTO user_preference_definition (id, version, groupName, displayName, description, valueType, type)
      VALUES (UUID(), 1, 'Notification', 'Community Updates', 'Receive notification when a new update is shared with a community I am a member of', 'boolean', 'NotificationCommunityUpdates')`
    );
    await queryRunner.query(
      `INSERT INTO user_preference_definition (id, version, groupName, displayName, description, valueType, type)
      VALUES (UUID(), 1, 'Notification', 'Community Discussion created', 'Receive notification when a new discussion is created on a community I am a member of', 'boolean', 'NotificationCommunityDiscussionCreated')`
    );
    await queryRunner.query(
      `INSERT INTO user_preference_definition (id, version, groupName, displayName, description, valueType, type)
      VALUES (UUID(), 1, 'Notification', 'Community Discussion response', 'Receive notification when a response is sent to a discussion I contributed to', 'boolean', 'NotificationCommunityDiscussionResponse')`
    );
    await queryRunner.query(
      `INSERT INTO user_preference_definition (id, version, groupName, displayName, description, valueType, type)
      VALUES (UUID(), 1, 'Notification', '[Admin] Community Applications', 'Receive notification when a new application is received for a community for which I am an administrator', 'boolean', 'NotificationApplicationReceived')`
    );
    await queryRunner.query(
      `INSERT INTO user_preference_definition (id, version, groupName, displayName, description, valueType, type)
      VALUES (UUID(), 1, 'Notification', '[Admin] New user sign up', 'Receive notification when a new user signs up', 'boolean', 'NotificationUserSignUp')`
    );
    // populate existing users with a preference of each definition
    const definitions: any[] = await queryRunner.query(
      'SELECT * FROM user_preference_definition'
    );
    const usersWithoutPreference: any[] = await queryRunner.query(
      `SELECT user.id FROM user
      LEFT JOIN user_preference on user_preference.userId = user.id
      WHERE user_preference.userId IS NULL`
    );
    for (const user of usersWithoutPreference) {
      for (const def of definitions) {
        const uuid = randomUUID();
        await queryRunner.query(
          `INSERT INTO authorization_policy VALUES ('${uuid}', NOW(), NOW(), 1, '', '', 0)`
        );
        await queryRunner.query(
          `INSERT INTO user_preference VALUES (UUID(), NOW(), NOW(), 1, 'false', '${uuid}', '${def.id}', '${user.id}')`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user_preference\` DROP FOREIGN KEY \`FK_5b141fbd1fef95a0540f7e7d1e2\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_preference\` DROP FOREIGN KEY \`FK_650fb4e564a8b4b4ac344270744\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user_preference\` DROP FOREIGN KEY \`FK_49030bc57aa0f319cee7996fca1\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_49030bc57aa0f319cee7996fca\` ON \`user_preference\``
    );
    await queryRunner.query(`DROP TABLE \`user_preference\``);
    await queryRunner.query(`DROP TABLE \`user_preference_definition\``);
  }
}
