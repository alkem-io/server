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

type UserSettingsNotification = {
  platform: UserSettingsNotificationPlatform;
  organization: UserSettingsNotificationOrganization;
  space: UserSettingsNotificationSpace;
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

    // Load up the preference definitions and convert them into a table
    const preferenceDefinitions: {
      id: string;
      type: string;
    }[] = await queryRunner.query(`SELECT id, type FROM preference_definition`);
    // Create a map from type to id
    const preferenceDefinitionsMap: Record<string, string> = {};
    for (const pref of preferenceDefinitions) {
      preferenceDefinitionsMap[pref.type] = pref.id;
    }

    // Check that there is an entry for each of the entries in the enum
    const preferenceTypes = Object.values(PreferenceType);
    for (const type of preferenceTypes) {
      if (!preferenceDefinitionsMap[type]) {
        const msg = `Missing preference definition for type ${type}`;
        console.error(msg);
        throw new Error(msg);
      }
    }

    // Convert the settings on all users
    const users: {
      id: string;
      settings: any;
      preferenceSetId: string;
    }[] = await queryRunner.query(
      `SELECT id, settings, preferenceSetId FROM user`
    );
    for (const user of users) {
      const newSettingsId = randomUUID();
      const newSettingsAuthID =
        await this.createAuthorizationPolicy(queryRunner);

      // Get all the preferences, and find the right one to update each of the fields in the notification object
      const notification: UserSettingsNotification = {
        platform: {
          forumDiscussionCreated: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_FORUM_DISCUSSION_CREATED
          ),
          forumDiscussionComment: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_FORUM_DISCUSSION_COMMENT
          ),
          newUserSignUp: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_USER_SIGN_UP
          ),
          userProfileRemoved: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_USER_REMOVED
          ),
        },
        organization: {
          messageReceived: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_ORGANIZATION_MESSAGE
          ),
          mentioned: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_ORGANIZATION_MENTION
          ),
        },
        space: {
          applicationReceived: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_APPLICATION_RECEIVED
          ),
          applicationSubmitted: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_APPLICATION_SUBMITTED
          ),
          communicationUpdates: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_COMMUNICATION_UPDATES
          ),
          communicationUpdatesAdmin: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_COMMUNICATION_UPDATE_SENT_ADMIN
          ),
          communityNewMember: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_COMMUNITY_NEW_MEMBER
          ),
          communityNewMemberAdmin: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_COMMUNITY_NEW_MEMBER_ADMIN
          ),
          communityInvitationUser: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_COMMUNITY_INVITATION_USER
          ),
          postCreatedAdmin: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_POST_CREATED_ADMIN
          ),
          postCreated: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_POST_CREATED
          ),
          postCommentCreated: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_POST_COMMENT_CREATED
          ),
          whiteboardCreated: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_WHITEBOARD_CREATED
          ),
          calloutPublished: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_CALLOUT_PUBLISHED
          ),
          communicationMention: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_COMMUNICATION_MENTION
          ),
          commentReply: await this.getPreferenceValue(
            queryRunner,
            preferenceDefinitionsMap,
            user.preferenceSetId,
            PreferenceType.NOTIFICATION_COMMENT_REPLY
          ),
        },
      };

      await queryRunner.query(
        `INSERT INTO user_settings (id, version, communication, privacy, notification, authorizationId) VALUES  (?, ?, ?, ?, ?, ?)`,
        [
          newSettingsId,
          1,
          JSON.stringify(user.settings.communication),
          JSON.stringify(user.settings.privacy),
          JSON.stringify(notification),
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

  private async getPreferenceValue(
    queryRunner: QueryRunner,
    preferenceDefinitionsMap: Record<string, string>,
    preferenceSetId: string,
    type: PreferenceType
  ): Promise<boolean> {
    const preferenceDefinitionId = preferenceDefinitionsMap[type];
    if (!preferenceDefinitionId) {
      throw new Error(`Preference definition for type ${type} not found`);
    }

    const preference: {
      value: boolean;
    }[] = await queryRunner.query(
      `SELECT value FROM preference WHERE preferenceSetId = ? AND preferenceDefinitionId = ?`,
      [preferenceSetId, preferenceDefinitionId]
    );
    if (preference.length === 0) {
      throw new Error(`Preference value for type ${type} not found`);
    }
    return preference[0].value;
  }

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

enum PreferenceType {
  NOTIFICATION_APPLICATION_RECEIVED = 'NotificationApplicationReceived',
  NOTIFICATION_APPLICATION_SUBMITTED = 'NotificationApplicationSubmitted',
  NOTIFICATION_COMMUNICATION_UPDATES = 'NotificationCommunityUpdates',
  NOTIFICATION_COMMUNICATION_UPDATE_SENT_ADMIN = 'NotificationCommunityUpdateSentAdmin',
  NOTIFICATION_COMMUNITY_NEW_MEMBER = 'NotificationCommunityNewMember',
  NOTIFICATION_COMMUNITY_NEW_MEMBER_ADMIN = 'NotificationCommunityNewMemberAdmin',
  NOTIFICATION_COMMUNITY_INVITATION_USER = 'NotificationCommunityInvitationUser',
  NOTIFICATION_POST_CREATED_ADMIN = 'NotificationPostCreatedAdmin',
  NOTIFICATION_POST_CREATED = 'NotificationPostCreated',
  NOTIFICATION_POST_COMMENT_CREATED = 'NotificationPostCommentCreated',
  NOTIFICATION_WHITEBOARD_CREATED = 'NotificationWhiteboardCreated',
  NOTIFICATION_CALLOUT_PUBLISHED = 'NotificationCalloutPublished',
  NOTIFICATION_COMMUNICATION_MENTION = 'NotificationCommunicationMention',
  NOTIFICATION_COMMENT_REPLY = 'NotificationCommentReply',

  // No longer used
  NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED = 'NotificationCommunityDiscussionCreated',
  NOTIFICATION_COMMUNICATION_DISCUSSION_CREATED_ADMIN = 'NotificationCommunityDiscussionCreatedAdmin',
  NOTIFICATION_DISCUSSION_COMMENT_CREATED = 'NotificationDiscussionCommentCreated',
  NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_USER = 'NotificationCommunityCollaborationInterestUser',
  NOTIFICATION_COMMUNITY_COLLABORATION_INTEREST_ADMIN = 'NotificationCommunityCollaborationInterestAdmin',
  NOTIFICATION_COMMUNITY_REVIEW_SUBMITTED = 'NotificationCommunityReviewSubmitted',
  NOTIFICATION_COMMUNITY_REVIEW_SUBMITTED_ADMIN = 'NotificationCommunityReviewSubmittedAdmin',

  // Covered in Organization settings
  NOTIFICATION_ORGANIZATION_MENTION = 'NotificationOrganizationMention',
  NOTIFICATION_ORGANIZATION_MESSAGE = 'NotificationOrganizationMessage',

  // Covered in Platform settings
  NOTIFICATION_USER_SIGN_UP = 'NotificationUserSignUp',
  NOTIFICATION_USER_REMOVED = 'NotificationUserRemoved',
  NOTIFICATION_FORUM_DISCUSSION_CREATED = 'NotificationForumDiscussionCreated',
  NOTIFICATION_FORUM_DISCUSSION_COMMENT = 'NotificationForumDiscussionComment',
}
