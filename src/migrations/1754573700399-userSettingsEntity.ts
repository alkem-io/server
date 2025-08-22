import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

// Local type to mimic UserSettingsNotificationPlatform interface
type UserSettingsNotificationPlatform = {
  forumDiscussionCreated: boolean;
  forumDiscussionComment: boolean;
  newUserSignUp: boolean;
  userProfileRemoved: boolean;
  spaceCreated: boolean;
};

// Local type to mimic UserSettingsNotificationOrganization interface
type UserSettingsNotificationOrganization = {
  messageReceived: boolean;
  mentioned: boolean;
};

type UserSettingsNotificationUser = {
  messageReceived: boolean;
  messageSent: boolean;
  mentioned: boolean;
  commentReply: boolean;
};

// Local type to mimic UserSettingsNotificationSpace interface
type UserSettingsNotificationSpace = {
  communityApplicationReceived: boolean;
  communityApplicationSubmitted: boolean;
  communicationUpdates: boolean;
  communicationUpdatesAdmin: boolean;
  communityNewMember: boolean;
  communityNewMemberAdmin: boolean;
  communityInvitationUser: boolean;
  collaborationPostCreatedAdmin: boolean;
  collaborationPostCreated: boolean;
  collaborationPostCommentCreated: boolean;
  collaborationWhiteboardCreated: boolean;
  collaborationCalloutPublished: boolean;
  communicationMessage: boolean;
  communicationMessageAdmin: boolean;
};

type UserSettingsNotification = {
  platform: UserSettingsNotificationPlatform;
  organization: UserSettingsNotificationOrganization;
  space: UserSettingsNotificationSpace;
  user: UserSettingsNotificationUser;
};

export class UserSettingsEntity1754573700399 implements MigrationInterface {
  name = 'UserSettingsEntity1754573700399';

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
    const missingPreferenceTypes: string[] = [];
    for (const type of preferenceTypes) {
      if (!preferenceDefinitionsMap[type]) {
        const msg = `Missing preference definition for type ${type}, defaulting to false`;
        console.warn(msg);
        missingPreferenceTypes.push(type);
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

    console.log(`Starting migration for ${users.length} users`);

    // Check if we have users without settings or preferenceSetId
    const usersWithoutSettings = users.filter(u => !u.settings).length;
    const usersWithoutPrefSet = users.filter(u => !u.preferenceSetId).length;

    if (usersWithoutSettings > 0) {
      console.warn(`Found ${usersWithoutSettings} users without settings`);
    }
    if (usersWithoutPrefSet > 0) {
      console.warn(
        `Found ${usersWithoutPrefSet} users without preferenceSetId`
      );
    }

    for (const user of users) {
      try {
        if (!user.preferenceSetId) {
          console.warn(`User ${user.id} has no preferenceSetId, skipping`);
          continue;
        }

        // Validate and parse user settings
        const userSettings = this.validateAndParseUserSettings(
          user.settings,
          user.id
        );
        if (!userSettings) {
          continue;
        }

        const newSettingsId = randomUUID();
        const newSettingsAuthID =
          await this.createAuthorizationPolicy(queryRunner);

        // Get all the preferences, and find the right one to update each of the fields in the notification object
        const notification: UserSettingsNotification = {
          platform: {
            spaceCreated: true,
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
            communityApplicationReceived: await this.getPreferenceValue(
              queryRunner,
              preferenceDefinitionsMap,
              user.preferenceSetId,
              PreferenceType.NOTIFICATION_APPLICATION_RECEIVED
            ),
            communityApplicationSubmitted: await this.getPreferenceValue(
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
            collaborationPostCreatedAdmin: await this.getPreferenceValue(
              queryRunner,
              preferenceDefinitionsMap,
              user.preferenceSetId,
              PreferenceType.NOTIFICATION_POST_CREATED_ADMIN
            ),
            collaborationPostCreated: await this.getPreferenceValue(
              queryRunner,
              preferenceDefinitionsMap,
              user.preferenceSetId,
              PreferenceType.NOTIFICATION_POST_CREATED
            ),
            collaborationPostCommentCreated: await this.getPreferenceValue(
              queryRunner,
              preferenceDefinitionsMap,
              user.preferenceSetId,
              PreferenceType.NOTIFICATION_POST_COMMENT_CREATED
            ),
            collaborationWhiteboardCreated: await this.getPreferenceValue(
              queryRunner,
              preferenceDefinitionsMap,
              user.preferenceSetId,
              PreferenceType.NOTIFICATION_WHITEBOARD_CREATED
            ),
            collaborationCalloutPublished: await this.getPreferenceValue(
              queryRunner,
              preferenceDefinitionsMap,
              user.preferenceSetId,
              PreferenceType.NOTIFICATION_CALLOUT_PUBLISHED
            ),
            communicationMessage: true, // Default value for new field
            communicationMessageAdmin: true, // Default value for new field
          },
          user: {
            messageReceived: true, // Default value for new field
            messageSent: true, // Default value for new field
            mentioned: await this.getPreferenceValue(
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

        // Safely stringify JSON with error handling
        let communicationJson: string;
        let privacyJson: string;
        let notificationJson: string;

        try {
          communicationJson = JSON.stringify(userSettings.communication);
        } catch (error) {
          console.warn(
            `Failed to stringify communication settings for user ${user.id}, using default:`,
            error
          );
          communicationJson = JSON.stringify({});
        }

        try {
          privacyJson = JSON.stringify(userSettings.privacy);
        } catch (error) {
          console.warn(
            `Failed to stringify privacy settings for user ${user.id}, using default:`,
            error
          );
          privacyJson = JSON.stringify({});
        }

        try {
          notificationJson = JSON.stringify(notification);
        } catch (error) {
          console.error(
            `Failed to stringify notification settings for user ${user.id}:`,
            error
          );
          continue;
        }

        await queryRunner.query(
          `INSERT INTO user_settings (id, version, communication, privacy, notification, authorizationId) VALUES  (?, ?, ?, ?, ?, ?)`,
          [
            newSettingsId,
            1,
            communicationJson,
            privacyJson,
            notificationJson,
            newSettingsAuthID,
          ]
        );
        await queryRunner.query(`UPDATE user SET settingsId = ? WHERE id = ?`, [
          newSettingsId,
          user.id,
        ]);
      } catch (error) {
        console.error(`Error migrating user ${user.id}:`, error);
      }
    }

    // Verify that all users now have settings
    const usersWithoutSettingsAfter = await queryRunner.query(
      `SELECT COUNT(*) as count FROM user WHERE settingsId IS NULL`
    );
    const countAfter = usersWithoutSettingsAfter[0].count;

    if (countAfter > 0) {
      console.warn(
        `Warning: ${countAfter} users still don't have settingsId after migration`
      );
    } else {
      console.log('✓ All users now have settingsId');
    }

    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`settings\``);

    await queryRunner.query(
      `ALTER TABLE \`user\` DROP FOREIGN KEY \`FK_028322b763dc94242dc9f638f9b\``
    );
    await queryRunner.query(
      `ALTER TABLE \`preference\` DROP FOREIGN KEY \`FK_46d60bf133073f749b8f07e534c\``
    );

    await queryRunner.query(
      `DROP INDEX \`IDX_390395c3d8592e3e8d8422ce85\` ON \`user\``
    );
    await queryRunner.query(
      `DROP INDEX \`REL_028322b763dc94242dc9f638f9\` ON \`user\``
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP COLUMN \`preferenceSetId\``
    );
    // drop the preference tables

    // Delete all authorizations where type = preference or preference-set
    await queryRunner.query(
      `Delete from authorization_policy where type = 'preference'`
    );
    await queryRunner.query(
      `Delete from authorization_policy where type = 'preference-set'`
    );

    await queryRunner.query(`DROP TABLE \`preference_definition\``);
    await queryRunner.query(`DROP TABLE \`preference\``);
    await queryRunner.query(`DROP TABLE \`preference_set\``);
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
      console.warn(
        `Preference definition for type ${type} not found, defaulting to false`
      );
      return false;
    }

    const preference: {
      value: any;
    }[] = await queryRunner.query(
      `SELECT value FROM preference WHERE preferenceSetId = ? AND preferenceDefinitionId = ?`,
      [preferenceSetId, preferenceDefinitionId]
    );
    if (preference.length === 0) {
      console.warn(
        `Preference value for type ${type} not found, defaulting to false`
      );
      return false;
    }
    const result = preference[0].value;

    // Convert to boolean - handle string and numeric representations
    if (
      result === 'true' ||
      result === true ||
      result === 1 ||
      result === '1'
    ) {
      return true;
    } else if (
      result === 'false' ||
      result === false ||
      result === 0 ||
      result === '0'
    ) {
      return false;
    } else {
      console.warn(
        `Preference value for type ${type} is not a valid boolean: ${result} (type: ${typeof result}), defaulting to false`
      );
      return false;
    }
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

  private validateAndParseUserSettings(
    settings: any,
    userId: string
  ): { communication: any; privacy: any } | null {
    try {
      // Handle null or undefined settings
      if (!settings) {
        console.warn(
          `User ${userId} has null/undefined settings, using defaults`
        );
        return {
          communication: {},
          privacy: {},
        };
      }

      // Handle string settings (JSON string)
      if (typeof settings === 'string') {
        try {
          const parsed = JSON.parse(settings);
          return this.validateSettingsStructure(parsed, userId);
        } catch (parseError) {
          console.warn(
            `User ${userId} has malformed JSON settings: ${parseError}, using defaults`
          );
          return {
            communication: {},
            privacy: {},
          };
        }
      }

      // Handle object settings
      if (typeof settings === 'object') {
        return this.validateSettingsStructure(settings, userId);
      }

      console.warn(
        `User ${userId} has unexpected settings type: ${typeof settings}, using defaults`
      );
      return {
        communication: {},
        privacy: {},
      };
    } catch (error) {
      console.error(`Error validating settings for user ${userId}:`, error);
      return null;
    }
  }

  private validateSettingsStructure(
    settings: any,
    userId: string
  ): { communication: any; privacy: any } {
    const result = {
      communication: {},
      privacy: {},
    };

    // Validate communication settings
    if (settings.communication) {
      if (
        typeof settings.communication === 'object' &&
        !Array.isArray(settings.communication)
      ) {
        result.communication = settings.communication;
      } else {
        console.warn(
          `User ${userId} has invalid communication settings structure, using default`
        );
      }
    }

    // Validate privacy settings
    if (settings.privacy) {
      if (
        typeof settings.privacy === 'object' &&
        !Array.isArray(settings.privacy)
      ) {
        result.privacy = settings.privacy;
      } else {
        console.warn(
          `User ${userId} has invalid privacy settings structure, using default`
        );
      }
    }

    return result;
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
