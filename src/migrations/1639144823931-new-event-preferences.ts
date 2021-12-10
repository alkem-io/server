import { MigrationInterface, QueryRunner } from 'typeorm';
import { RandomGenerator } from 'typeorm/util/RandomGenerator';

export class newEventPreferences1639144823931 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO user_preference_definition (id, version, groupName, displayName, description, valueType, type)
        VALUES (UUID(), 1, 'Notification', '[Admin] Community Discussion Created', 'Receive notification when a new application is received for a community for which I am an administrator', 'boolean', 'NotificationCommunityDiscussionCreatedAdmin')`
    );
    await queryRunner.query(
      `INSERT INTO user_preference_definition (id, version, groupName, displayName, description, valueType, type)
        VALUES (UUID(), 1, 'Notification', '[Admin] Community Updates', 'Receive notification when a new update is shared with a community for which I am an administrator', 'boolean', 'NotificationCommunityUpdateSentAdmin')`
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
    usersWithoutPreference.forEach(user =>
      definitions
        .filter(
          x =>
            x.type === 'NotificationCommunityUpdateSentAdmin' ||
            x.type === 'NotificationCommunityDiscussionCreatedAdmin'
        )
        .forEach(async def => {
          const uuid = RandomGenerator.uuid4();
          await queryRunner.query(
            `INSERT INTO authorization_policy VALUES ('${uuid}', NOW(), NOW(), 1, '', '', 0)`
          );
          await queryRunner.query(
            `INSERT INTO user_preference VALUES (UUID(), NOW(), NOW(), 1, 'false', '${uuid}', '${def.id}', '${user.id}')`
          );
        })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
