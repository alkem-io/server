import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class communityContextReviewPreferences1648217119945
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const defUserUUID = randomUUID();
    const defAdminUUID = randomUUID();
    await queryRunner.query(
      `INSERT INTO preference_definition (id, version, definitionSet, groupName, displayName, description, valueType, type)
          VALUES
            ('${defUserUUID}', 1, 'user', 'Notification', 'Community review submitted', 'Receive notification when you submit a new community review', 'boolean', 'NotificationCommunityReviewSubmitted'),
            ('${defAdminUUID}', 1, 'user', 'NotificationCommunityAdmin', '[Admin] Community review submitted', 'Receive notification when a new community review is submitted by a member', 'boolean', 'NotificationCommunityReviewSubmittedAdmin')`
    );

    const users: any[] = await queryRunner.query(`SELECT user.id FROM user`);

    for (const user of users) {
      const userAuthUUID = randomUUID();
      const adminAuthUUID = randomUUID();
      await queryRunner.query(
        `INSERT INTO authorization_policy
             VALUES
              ('${userAuthUUID}', NOW(), NOW(), 1, '', '', 0, ''),
              ('${adminAuthUUID}', NOW(), NOW(), 1, '', '', 0, '')`
      );
      await queryRunner.query(
        `INSERT INTO preference
             VALUES
              (UUID(), NOW(), NOW(), 1, 'true', '${userAuthUUID}', '${defUserUUID}', '${user.id}', NULL),
              (UUID(), NOW(), NOW(), 1, 'true', '${adminAuthUUID}', '${defAdminUUID}', '${user.id}', NULL)`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const prefDefs: any[] = await queryRunner.query(
      `SELECT id FROM preference_definition
           WHERE type in ('NotificationCommunityReviewSubmittedAdmin', 'NotificationCommunityReviewSubmitted')`
    );
    const prefDefIds = prefDefs.map(x => `'${x.id}'`).join(',');

    const auths: any[] = await queryRunner.query(
      `SELECT authorizationId FROM preference
           WHERE preferenceDefinitionId in (${prefDefIds})`
    );
    const authIds = auths.map(x => `'${x.authorizationId}'`).join(',');

    await queryRunner.query(
      `DELETE FROM preference WHERE preferenceDefinitionId in (${prefDefIds})`
    );
    await queryRunner.query(
      `DELETE FROM preference_definition WHERE id in (${prefDefIds})`
    );

    await queryRunner.query(
      `DELETE FROM authorization_policy WHERE id in (${authIds})`
    );
  }
}
