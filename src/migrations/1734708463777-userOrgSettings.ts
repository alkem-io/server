import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserOrgSettings1734636338402 implements MigrationInterface {
  name = 'UserOrgSettings1734636338402';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP FOREIGN KEY \`FK_58fd47c4a6ac8df9fe2bcaed874\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_58fd47c4a6ac8df9fe2bcaed87\` ON \`organization\``
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD \`settings\` json NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`settings\` json NOT NULL`
    );

    //
    const organizations: {
      id: string;
      preferenceSetId: string;
    }[] = await queryRunner.query(
      `SELECT id, preferenceSetId FROM \`organization\``
    );
    for (const organization of organizations) {
      const [orgPreferenceSet]: {
        id: string;
        authorizationId: string;
      }[] = await queryRunner.query(
        `SELECT id, authorizationId FROM preference_set WHERE id = ?`,
        [organization.preferenceSetId]
      );

      const [orgPreference]: {
        id: string;
        authorizationId: string;
        value: string;
      }[] = await queryRunner.query(
        `SELECT id, authorizationId, value FROM preference WHERE preferenceSetId = ?`,
        [organization.preferenceSetId]
      );

      // create the settings object
      const settings = this.organizationSettings;
      settings.membership.allowUsersMatchingDomainToJoin = Boolean(
        orgPreference.value
      );
      // update the organization settingsStr
      await queryRunner.query(
        `UPDATE \`organization\` SET settings = ? WHERE id = ?`,
        [JSON.stringify(settings), organization.id]
      );
      // Delete the preference set and preferences
      await queryRunner.query(
        `DELETE FROM preference WHERE preferenceSetId = ?`,
        [organization.preferenceSetId]
      );
      await queryRunner.query(`DELETE FROM preference_set WHERE id = ?`, [
        organization.preferenceSetId,
      ]);
      // and the authorization policy
      await queryRunner.query(`DELETE FROM authorization_policy WHERE id = ?`, [
        orgPreferenceSet.authorizationId,
      ]);
      await queryRunner.query(`DELETE FROM authorization_policy WHERE id = ?`, [
        orgPreference.authorizationId,
      ]);
    }

    const users: {
      id: string;
      preferenceSetId: string;
    }[] = await queryRunner.query(`SELECT id, preferenceSetId FROM \`user\``);
    for (const user of users) {
      const [userPreferenceDefinition]: {
        id: string;
        authorizationId: string;
      }[] = await queryRunner.query(
        `SELECT id FROM preference_definition WHERE type = ?`,
        ['NotificationCommunicationMention']
      );

      const [userPreference]: {
        id: string;
        authorizationId: string;
        value: string;
      }[] = await queryRunner.query(
        `SELECT id, authorizationId, value FROM preference WHERE preferenceSetId = ? and preferenceDefinitionId = ?`,
        [user.preferenceSetId, userPreferenceDefinition.id]
      );

      // create the settings object
      const settings = this.userSettings;
      settings.communication.allowOtherUsersToSendMessages = Boolean(
        userPreference.value
      );
      // update the organization settingsStr
      await queryRunner.query(`UPDATE \`user\` SET settings = ? WHERE id = ?`, [
        JSON.stringify(settings),
        user.id,
      ]);
      // Delete the preference set and preferences
      await queryRunner.query(
        `DELETE FROM preference WHERE preferenceSetId = ?`,
        [user.preferenceSetId]
      );

      // and the authorization policy
      await queryRunner.query(`DELETE FROM authorization_policy WHERE id = ?`, [
        userPreference.authorizationId,
      ]);
    }

    // delete the preference definitions
    await queryRunner.query(
      `DELETE FROM preference_definition WHERE type = ?`,
      ['AuthorizationOrganizationMatchDomain']
    );
    await queryRunner.query(
      `DELETE FROM preference_definition WHERE type = ?`,
      ['NotificationCommunicationMention']
    );

    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`preferenceSetId\``
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`organization\` DROP COLUMN \`settingsStr\``
    );
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`settingsStr\``);
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_58fd47c4a6ac8df9fe2bcaed87\` ON \`organization\` (\`preferenceSetId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`organization\` ADD CONSTRAINT \`FK_58fd47c4a6ac8df9fe2bcaed874\` FOREIGN KEY (\`preferenceSetId\`) REFERENCES \`preference_set\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  private organizationSettings = {
    membership: {
      allowUsersMatchingDomainToJoin: false,
    },
    privacy: {
      // Note: not currently used but will be near term.
      contributionRolesPubliclyVisible: true,
    },
  };

  private userSettings = {
    communication: {
      allowOtherUsersToSendMessages: true,
    },
    privacy: {
      // Note: not currently used but will be near term.
      contributionRolesPubliclyVisible: true,
    },
  };
}
