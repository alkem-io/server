import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

// Local type to mimic UserSettingsNotificationPlatform interface
type UserSettingsNotificationPlatform = {
  forumDiscussionCreated: boolean;
  forumDiscussionComment: boolean;
  newUserSignUp: boolean;
  userProfileRemoved: boolean;
};

// Local type to mimic UserSettingsNotificationOrganization interface
type UserSettingsNotificationOrganization = {
  messageReceived: boolean;
  mentioned: boolean;
};

// Local type to mimic UserSettingsNotificationSpace interface
type UserSettingsNotificationSpace = {
  applicationReceived: boolean;
  applicationSubmitted: boolean;
  communicationUpdates: boolean;
  communicationUpdatesAdmin: boolean;
  communityNewMember: boolean;
  communityNewMemberAdmin: boolean;
  communityInvitationUser: boolean;
  postCreatedAdmin: boolean;
  postCreated: boolean;
  postCommentCreated: boolean;
  whiteboardCreated: boolean;
  calloutPublished: boolean;
  communicationMention: boolean;
  commentReply: boolean;
};

export class UserSettingsEntity1753882078257 implements MigrationInterface {
  name = 'UserSettingsEntity1753882078257';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`user_settings\` (\`id\` char(36) NOT NULL,
                                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                \`updatedDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                                \`version\` int NOT NULL,
                                \`communication\` json NOT NULL,
                                \`privacy\` json NOT NULL,
                                \`notification\` json NOT NULL,
                                \`authorizationId\` char(36) NULL,
                                UNIQUE INDEX \`REL_320cf6b7374f1204df6741bbb0\` (\`authorizationId\`),
                                PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`settingsId\` char(36) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_390395c3d8592e3e8d8422ce85\` (\`settingsId\`)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`REL_390395c3d8592e3e8d8422ce85\` ON \`user\` (\`settingsId\`)`
    );
    await queryRunner.query(
      `ALTER TABLE \`user_settings\` ADD CONSTRAINT \`FK_320cf6b7374f1204df6741bbb0c\` FOREIGN KEY (\`authorizationId\`) REFERENCES \`authorization_policy\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD CONSTRAINT \`FK_390395c3d8592e3e8d8422ce853\` FOREIGN KEY (\`settingsId\`) REFERENCES \`user_settings\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
    );

    // Convert the settings on all users
    const users: { id: string; settings: string }[] = await queryRunner.query(
      `SELECT id, settings FROM user`
    );
    for (const user of users) {
      const settings = JSON.parse(user.settings);
      const newSettingsId = randomUUID();
      const newSettingsAuthID =
        await this.createAuthorizationPolicy(queryRunner);
      await queryRunner.query(
        `INSERT INTO user_settings (id, version, communication, privacy, authorizationId) VALUES  (?, ?, ?, ?, ?)`,
        [
          newSettingsId,
          1,
          JSON.stringify(settings.communication),
          JSON.stringify(settings.privacy),
          JSON.stringify(settings.notification),
          newSettingsAuthID,
        ]
      );
      await queryRunner.query(`UPDATE user SET settingsId = ? WHERE id = ?`, [
        newSettingsId,
        user.id,
      ]);
    }

    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`settings\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}

  private async createAuthorizationPolicy(
    queryRunner: QueryRunner,
    authorizationType: string = 'user-settings'
  ): Promise<string> {
    const authID = randomUUID();
    await queryRunner.query(
      `INSERT INTO authorization_policy (id, version, credentialRules, verifiedCredentialRules, privilegeRules, type)
             VALUES (?, ?, ?, ?, ?, ?)`,
      [authID, 1, '[]', '[]', '[]', authorizationType]
    );
    return authID;
  }
}
